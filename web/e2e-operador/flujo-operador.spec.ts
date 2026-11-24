import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const requireApi = createRequire(resolve(__dirname, "../../api/package.json"));
const { Client } = requireApi("pg");

test("CARQ-222: login, llegada, ingreso, rechazo por deuda, pago en Caja y salida", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill("operador");
  await page.getByLabel("Contraseña", { exact: true }).fill("operador123");
  await page.getByRole("button", { name: "Ingresar a mi espacio" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await page
    .getByRole("link", { name: /carril/i })
    .first()
    .click();
  await expect(page.getByText("Carril libre", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Simular llegada de vehículo" })
    .click();
  await expect(
    page.getByText("Vehículo presente en el carril", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Placa del vehículo", { exact: true }).fill("EST123");
  await page
    .getByRole("button", { name: "Confirmar placa para entrada" })
    .click();
  await expect(
    page.getByText("Entrada autorizada: Ingreso autorizado", { exact: true }),
  ).toBeVisible();

  // Espera el cierre real del simulador antes de verificar el rechazo por deuda.
  await expect(page.getByText("Cerrada", { exact: true })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("radio", { name: /salida/i }).check();
  await page.getByLabel("Placa del vehículo", { exact: true }).fill("EST123");
  await page
    .getByRole("button", { name: "Confirmar placa para salida" })
    .click();
  await expect(
    page.getByText("Salida rechazada: Cobro pendiente, pasar por caja", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Cerrada", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /caja/i }).first().click();
  await page.getByLabel("Placa", { exact: true }).fill("EST123");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("list", { name: "Cobros de EST123" })
    .getByRole("button")
    .click();
  await page
    .getByRole("button", { name: "Registrar pago en efectivo" })
    .click();
  await expect(
    page.getByText("Pago registrado.", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: /carril/i })
    .first()
    .click();
  await page.getByRole("radio", { name: /salida/i }).check();
  await page.getByLabel("Placa del vehículo", { exact: true }).fill("EST123");
  await page
    .getByRole("button", { name: "Confirmar placa para salida" })
    .click();
  await expect(page.getByText(/^Salida autorizada:/)).toBeVisible();
  await expect(page.getByText("Abierta", { exact: true })).toBeVisible();

  const direccion = new URL(process.env.CARQ_E2E_DB_URL!);
  if (direccion.pathname !== "/carq_e2e_pruebas")
    throw new Error("Solo se consulta la base E2E");
  const db = new Client({ connectionString: direccion.toString() });
  await db.connect();
  try {
    const cobros = await db.query("SELECT placa, estado FROM cobro");
    expect(cobros.rows).toEqual([{ placa: "EST123", estado: "PAGADO" }]);
    const pagos = await db.query("SELECT operador, monto FROM pago");
    expect(pagos.rows).toEqual([{ operador: "operador", monto: 5000 }]);
    const estancias = await db.query("SELECT placa, salida_en FROM estancia");
    expect(estancias.rows).toHaveLength(1);
    expect(estancias.rows[0].salida_en).not.toBeNull();
    const eventos = await db.query(
      "SELECT sentido, resultado, lectura_manual, operador FROM evento ORDER BY id",
    );
    expect(eventos.rows).toEqual([
      {
        sentido: "ENTRADA",
        resultado: "AUTORIZADO",
        lectura_manual: true,
        operador: "operador",
      },
      {
        sentido: "SALIDA",
        resultado: "RECHAZADO",
        lectura_manual: true,
        operador: "operador",
      },
      {
        sentido: "SALIDA",
        resultado: "AUTORIZADO",
        lectura_manual: true,
        operador: "operador",
      },
    ]);
  } finally {
    await db.end();
  }
});
