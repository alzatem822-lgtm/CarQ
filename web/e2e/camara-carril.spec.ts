import { expect, test } from "@playwright/test";

const imagenPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
  "base64",
);

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

test("CARQ-158: confirma imagen alternativa sin cámara en ambos sentidos", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => Promise.reject(new DOMException("Denegado", "NotAllowedError")),
    });
  });
  let solicitudes = 0;
  page.on("request", r => {
    if (r.method() === "POST" && /\/carril\/(ingreso|salida)$/.test(r.url())) solicitudes++;
  });
  await page.goto("/carril");
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await expect(page.getByText(/No hay permiso para usar la cámara/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar imagen para entrada" })).toBeDisabled();
  await page.getByLabel("Imagen alternativa", { exact: true }).setInputFiles({
    name: "vehiculo.png", mimeType: "image/png", buffer: imagenPng,
  });
  expect(solicitudes).toBe(0);
  for (const [sentido, ruta] of [["entrada", "/carril/ingreso"], ["salida", "/carril/salida"]]) {
    if (sentido === "salida") await page.getByRole("radio", { name: /salida/i }).check();
    const enviada = page.waitForRequest(r => new URL(r.url()).pathname === ruta && r.method() === "POST");
    await page.getByRole("button", { name: `Enviar imagen para ${sentido}` }).click();
    const peticion = await enviada;
    expect(peticion.headers().authorization).toBe("Bearer prueba-camara");
    expect(peticion.headers()["content-type"]).toContain("multipart/form-data; boundary=");
    const cuerpo = peticion.postDataBuffer()!;
    expect(cuerpo.toString("latin1")).toContain('name="imagen"; filename="vehiculo.png"');
    expect(cuerpo.toString("latin1")).toContain("Content-Type: image/png");
    expect(cuerpo.includes(imagenPng)).toBe(true);
    await expect(page.getByText(`${sentido === "entrada" ? "Entrada" : "Salida"}: Se requiere validación manual`, { exact: true })).toBeVisible();
  }
  expect(solicitudes).toBe(2);
  await expect(page.getByRole("button", { name: "Capturar salida" })).toBeDisabled();
});

test("CARQ-158: rechaza archivos vacíos, formatos ajenos y exceso de tamaño sin enviarlos", async ({ page }) => {
  let solicitudes = 0;
  page.on("request", r => { if (r.method() === "POST") solicitudes++; });
  await page.goto("/carril");
  const campo = page.getByLabel("Imagen alternativa", { exact: true });
  for (const [nombre, tipo, datos, mensaje] of [
    ["texto.txt", "text/plain", Buffer.from("texto"), "Selecciona una imagen JPEG, PNG o WebP."],
    ["vacia.png", "image/png", Buffer.alloc(0), "La imagen debe contener datos y no superar 5 MiB."],
    ["grande.png", "image/png", Buffer.alloc(5 * 1024 * 1024 + 1), "La imagen debe contener datos y no superar 5 MiB."],
  ] as const) {
    await campo.setInputFiles({ name: nombre, mimeType: tipo, buffer: datos });
    await expect(page.getByText(mensaje, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar imagen para entrada" })).toBeDisabled();
  }
  expect(solicitudes).toBe(0);
});

test("CARQ-158: bloquea ambas fuentes durante el envío y conserva el error de la API", async ({ page }) => {
  let solicitudes = 0;
  let liberar!: () => void;
  const pendiente = new Promise<void>(r => { liberar = r; });
  await page.route("**/carril/ingreso", async route => {
    solicitudes++;
    await pendiente;
    await route.fulfill({ status: 422, json: { codigo: "LECTURA_NO_DISPONIBLE", motivo: "El lector no está disponible" } });
  });
  await page.goto("/carril");
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await expect(page.getByRole("button", { name: "Capturar entrada" })).toBeEnabled();
  await page.getByLabel("Imagen alternativa", { exact: true }).setInputFiles({ name: "vehiculo.png", mimeType: "image/png", buffer: imagenPng });
  await page.getByRole("button", { name: "Enviar imagen para entrada" }).click();
  await expect(page.getByRole("button", { name: "Procesando captura…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Procesando imagen…" })).toBeDisabled();
  await expect(page.getByLabel("Imagen alternativa", { exact: true })).toBeDisabled();
  liberar();
  await expect(page.getByText("El lector no está disponible", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar imagen para entrada" })).toBeEnabled();
  expect(solicitudes).toBe(1);
});
