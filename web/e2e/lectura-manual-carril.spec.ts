import { expect, test, type Page } from "@playwright/test";

async function preparar(page: Page, placa: string | null = "ABC123") {
  const estado = {
    simulacionHabilitada: false,
    vehiculoPresente: true,
    sentido: "ENTRADA",
    ultimaLectura: placa ? { placa, confianza: 0.3, origen: "SIMULADO" } : null,
    ultimoResultado: {
      resultado: "REQUIERE_LECTURA_MANUAL",
      motivo: "Se requiere validación manual",
    },
    barrera: { estado: "CERRADA", motivo: null },
    requiereValidacionManual: true,
  };
  const control = { consultas: 0 };
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "carq.sesion",
      JSON.stringify({ token: "prueba-manual", rol: "OPERADOR" }),
    );
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const contexto = canvas.getContext("2d")!;
        contexto.fillStyle = "red";
        contexto.fillRect(0, 0, 320, 180);
        return canvas.captureStream(5);
      },
    });
  });
  await page.route("http://localhost:3001/**", async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta === "/carril/estado") control.consultas++;
    await route.fulfill({
      json:
        ruta === "/auth/sesion"
          ? { rol: "OPERADOR" }
          : ruta === "/carril/estado"
            ? estado
            : ruta === "/carril/ocupacion"
              ? { cupos: [] }
              : { resultado: "AUTORIZADO", motivo: "Operación autorizada" },
    });
  });
  return { estado, control };
}

test("CARQ-165: corrige la placa sugerida sin que el sondeo sobrescriba la edición", async ({
  page,
}) => {
  const { control } = await preparar(page);
  await page.goto("/carril");
  const placa = page.getByLabel("Placa del vehículo", { exact: true });
  await expect(placa).toHaveValue("ABC123");
  await placa.fill(" xyz-987 ");
  const consultas = control.consultas;
  await expect.poll(() => control.consultas).toBeGreaterThan(consultas);
  await expect(placa).toHaveValue(" xyz-987 ");
  const peticion = page.waitForRequest(
    (r) => r.url().endsWith("/carril/lectura-manual") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirmar placa para entrada" })
    .click();
  const enviada = await peticion;
  expect(enviada.postDataJSON()).toEqual({
    sentido: "ENTRADA",
    placa: "XYZ987",
  });
  expect(enviada.headers().authorization).toBe("Bearer prueba-manual");
  await expect(
    page.getByText("Entrada autorizada: Operación autorizada", { exact: true }),
  ).toBeVisible();
});

test("CARQ-165: admite placa sin detección y envía el sentido elegido", async ({
  page,
}) => {
  await preparar(page, null);
  await page.goto("/carril");
  await expect(
    page.getByRole("button", { name: "Confirmar placa para entrada" }),
  ).toBeDisabled();
  await page.getByLabel("Placa del vehículo", { exact: true }).fill("abc12a");
  await page.getByRole("radio", { name: /salida/i }).check();
  const placa = page.getByLabel("Placa del vehículo", { exact: true });
  await expect(placa).toHaveValue("");
  await placa.fill("abc12a");
  const peticion = page.waitForRequest(
    (r) => r.url().endsWith("/carril/lectura-manual") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirmar placa para salida" })
    .click();
  expect((await peticion).postDataJSON()).toEqual({
    sentido: "SALIDA",
    placa: "ABC12A",
  });
  await expect(
    page.getByText("Salida autorizada: Operación autorizada", { exact: true }),
  ).toBeVisible();
});

test("CARQ-165: no envía formato inválido y distingue rechazo de negocio de autorización", async ({
  page,
}) => {
  await preparar(page);
  let solicitudes = 0;
  await page.route("**/carril/lectura-manual", async (route) => {
    solicitudes++;
    await route.fulfill({
      json: {
        resultado: "RECHAZADO",
        motivo: "Cobro pendiente, pasar por caja",
      },
    });
  });
  await page.goto("/carril");
  await page.getByLabel("Placa del vehículo", { exact: true }).fill("XX");
  await page
    .getByRole("button", { name: "Confirmar placa para entrada" })
    .click();
  await expect(page.getByText(/Escribe una placa válida/)).toBeVisible();
  expect(solicitudes).toBe(0);
  await page.getByLabel("Placa del vehículo", { exact: true }).fill("ABC123");
  await page
    .getByRole("button", { name: "Confirmar placa para entrada" })
    .click();
  await expect(
    page.getByText("Entrada rechazada: Cobro pendiente, pasar por caja", {
      exact: true,
    }),
  ).toBeVisible();
  expect(solicitudes).toBe(1);
});

test("CARQ-165: coordina confirmación con cámara automática, selector y archivos sin duplicados", async ({
  page,
}) => {
  const { control } = await preparar(page);
  let confirmar = 0;
  let capturar = 0;
  let liberar!: () => void;
  const pendiente = new Promise<void>((r) => {
    liberar = r;
  });
  await page.route("**/carril/lectura-manual", async (route) => {
    confirmar++;
    await pendiente;
    await route.fulfill({
      status: 422,
      json: {
        codigo: "BARRERA_NO_DISPONIBLE",
        motivo: "La operación quedó registrada; no se confirmó la barrera",
      },
    });
  });
  await page.route("**/carril/ingreso", async (route) => {
    capturar++;
    await route.fulfill({
      json: { resultado: "AUTORIZADO", motivo: "Ingreso autorizado" },
    });
  });
  await page.goto("/carril");
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await expect(
    page.getByRole("button", { name: "Capturar entrada" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Confirmar placa para entrada" })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmando placa…" }),
  ).toBeDisabled();
  await expect(page.getByRole("radio", { name: /salida/i })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Capturar entrada" }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Imagen alternativa", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Captura automática al detectar vehículo" })
    .check();
  liberar();
  await expect(
    page.getByText("La operación quedó registrada; no se confirmó la barrera", {
      exact: true,
    }),
  ).toBeVisible();
  const consultas = control.consultas;
  await expect.poll(() => control.consultas).toBeGreaterThan(consultas);
  expect(confirmar).toBe(1);
  expect(capturar).toBe(0);
  await expect(
    page.getByRole("button", { name: "Confirmar placa para entrada" }),
  ).toBeEnabled();
});

test("CARQ-165: no reintenta ante pérdida de conexión y conserva la placa", async ({
  page,
}) => {
  await preparar(page);
  let solicitudes = 0;
  await page.route("**/carril/lectura-manual", async (route) => {
    solicitudes++;
    await route.abort("failed");
  });
  await page.goto("/carril");
  await page
    .getByRole("button", { name: "Confirmar placa para entrada" })
    .click();
  await expect(
    page.getByText(
      /La operación pudo registrarse; revisa el estado del carril/,
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel("Placa del vehículo", { exact: true }),
  ).toHaveValue("ABC123");
  expect(solicitudes).toBe(1);
});
