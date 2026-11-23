import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "carq.sesion",
      JSON.stringify({ token: "prueba-camara", rol: "OPERADOR" }),
    );
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, 320, 180);
        return canvas.captureStream(5);
      },
    });
  });
  await page.route("http://localhost:3001/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body =
      path === "/auth/sesion"
        ? { rol: "OPERADOR" }
        : path === "/carril/estado"
          ? {
              simulacionHabilitada: false,
              vehiculoPresente: false,
              sentido: null,
              ultimaLectura: null,
              ultimoResultado: null,
              barrera: { estado: "CERRADA", motivo: null },
              requiereValidacionManual: false,
            }
          : path === "/carril/ocupacion"
            ? { cupos: [] }
            : {
                resultado: "REQUIERE_LECTURA_MANUAL",
                motivo: "Se requiere validación manual",
              };
    await route.fulfill({ json: body });
  });
});

test("CARQ-157: captura JPEG multipart con JWT y destino según selector", async ({
  page,
}) => {
  await page.goto("/carril");
  await expect(
    page.getByRole("button", { name: "Capturar entrada" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await expect(
    page.getByRole("button", { name: "Capturar entrada" }),
  ).toBeEnabled();
  for (const [sentido, ruta] of [
    ["entrada", "/carril/ingreso"],
    ["salida", "/carril/salida"],
  ]) {
    if (sentido === "salida")
      await page.getByRole("radio", { name: /salida/i }).check();
    const peticion = page.waitForRequest(
      (r) => new URL(r.url()).pathname === ruta && r.method() === "POST",
    );
    await page.getByRole("button", { name: `Capturar ${sentido}` }).click();
    const enviada = await peticion;
    expect(enviada.headers()["authorization"]).toBe("Bearer prueba-camara");
    expect(enviada.headers()["content-type"]).toContain(
      "multipart/form-data; boundary=",
    );
    expect(enviada.postDataBuffer()?.toString("latin1")).toContain(
      'name="imagen"; filename="captura.jpg"',
    );
    expect(enviada.postDataBuffer()?.toString("latin1")).toContain(
      "Content-Type: image/jpeg",
    );
    await expect(
      page.getByText(
        `${sentido === "entrada" ? "Entrada" : "Salida"}: Se requiere validación manual`,
        { exact: true },
      ),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Apagar cámara" }).click();
  await expect(
    page.getByRole("button", { name: "Capturar salida" }),
  ).toBeDisabled();
  expect(
    await page
      .locator("video")
      .evaluate((v) => (v as HTMLVideoElement).srcObject),
  ).toBeNull();
});

test("CARQ-157: informa permiso denegado y permite intentar de nuevo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        Promise.reject(new DOMException("Denegado", "NotAllowedError")),
    });
  });
  await page.goto("/carril");
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /cámara|barrera/ })).toContainText(
    "No hay permiso para usar la cámara",
  );
  await expect(
    page.getByRole("button", { name: "Capturar entrada" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Activar cámara" }),
  ).toBeEnabled();
});

test("CARQ-157: evita envíos duplicados y muestra un fallo sin confirmar éxito", async ({
  page,
}) => {
  let solicitudes = 0;
  let resolver!: () => void;
  const liberar = new Promise<void>((r) => {
    resolver = r;
  });
  await page.route("**/carril/ingreso", async (route) => {
    solicitudes++;
    await liberar;
    await route.fulfill({
      status: 422,
      json: {
        codigo: "BARRERA_NO_DISPONIBLE",
        motivo:
          "La operación quedó registrada, pero no se pudo confirmar la orden de barrera",
      },
    });
  });
  await page.goto("/carril");
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await page.getByRole("button", { name: "Capturar entrada" }).click();
  await expect(
    page.getByRole("button", { name: "Procesando captura…" }),
  ).toBeDisabled();
  resolver();
  await expect(page.getByRole("alert").filter({ hasText: /cámara|barrera/ })).toContainText(
    "no se pudo confirmar la orden de barrera",
  );
  expect(solicitudes).toBe(1);
});

test('CARQ-157: libera la cámara al salir del carril', async ({ page }) => {
  await page.goto('/carril');
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.getByRole('button', { name: 'Capturar entrada' })).toBeEnabled();
  const pistas = await page.locator('video').evaluateHandle(v => (v as HTMLVideoElement).srcObject as MediaStream);
  await page.getByRole('link', { name: /caja/i }).first().click();
  await expect(page).toHaveURL(/\/caja/);
  expect(await pistas.evaluate(s => s.getTracks().every(t => t.readyState === 'ended'))).toBe(true);
});
