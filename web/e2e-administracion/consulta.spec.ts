import { expect, test, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { iniciarSesion } from "./iniciar-sesion";

const requireApi = createRequire(resolve(__dirname, "../../api/package.json"));
const { Client } = requireApi("pg");
const placa = "QRY224";

async function aplicarFiltros(
  page: Page,
  desde: string,
  hasta: string,
  campoEstado: "Resultado" | "Estado",
  estado: string,
) {
  const filtros = page.getByRole("form", { name: "Filtros de consulta" });
  await filtros.getByLabel("Placa").fill(placa);
  await filtros.getByLabel("Desde").fill(desde);
  await filtros.getByLabel("Hasta").fill(hasta);
  await filtros.getByLabel(campoEstado).selectOption(estado);
  await filtros.getByRole("button", { name: "Aplicar filtros" }).click();
}

test.beforeAll(async () => {
  const direccion = new URL(process.env.CARQ_E2E_DB_URL ?? "");
  if (
    direccion.pathname !== "/carq_e2e_pruebas" ||
    !["localhost", "127.0.0.1"].includes(direccion.hostname)
  ) {
    throw new Error("Consulta E2E requiere una base local carq_e2e_pruebas.");
  }

  const db = new Client({ connectionString: direccion.toString() });
  await db.connect();
  try {
    await db.query(
      `INSERT INTO evento
         (sede_id, carril_id, placa, sentido, resultado, motivo, origen, ocurrido_en)
       SELECT carril.sede_id, carril.id, $1, 'ENTRADA', 'AUTORIZADO',
              'Registro ' || numero, 'SIMULADO',
              '2026-11-22T15:00:00Z'::timestamptz + numero * interval '1 minute'
       FROM carril CROSS JOIN generate_series(1, 21) AS numero
       UNION ALL
       SELECT sede_id, id, 'EXT224', 'ENTRADA', 'AUTORIZADO',
              'Otra placa', 'SIMULADO', '2026-11-22T16:00:00Z'::timestamptz
       FROM carril
       UNION ALL
       SELECT sede_id, id, $1, 'ENTRADA', 'RECHAZADO',
              'Otro resultado', 'SIMULADO', '2026-11-22T16:00:00Z'::timestamptz
       FROM carril
       UNION ALL
       SELECT sede_id, id, $1, 'ENTRADA', 'AUTORIZADO',
              'Otro día', 'SIMULADO', '2026-11-23T05:00:00Z'::timestamptz
       FROM carril`,
      [placa],
    );
    await db.query(
      `INSERT INTO cobro
         (sede_id, placa, tipo_vehiculo, dia_operativo, franja, tarifa_aplicada, estado)
       SELECT id, $1, 'CARRO', date '2026-11-01' + desplazamiento,
              'DIURNA', 5000, 'PENDIENTE'
       FROM sede CROSS JOIN generate_series(0, 20) AS desplazamiento
       UNION ALL
       SELECT id, 'EXT224', 'CARRO', date '2026-11-22', 'DIURNA', 5000, 'PENDIENTE'
       FROM sede
       UNION ALL
       SELECT id, $1, 'CARRO', date '2026-11-23', 'DIURNA', 5000, 'PAGADO'
       FROM sede
       UNION ALL
       SELECT id, $1, 'CARRO', date '2026-11-24', 'DIURNA', 5000, 'PENDIENTE'
       FROM sede`,
      [placa],
    );
  } finally {
    await db.end();
  }
});

test.beforeEach(async ({ page }) => {
  await iniciarSesion(page, "operador");
  await page.getByRole("link", { name: "Consulta", exact: true }).click();
  await expect(page).toHaveURL(/\/consulta$/);
});

test("CARQ-224: filtra eventos por placa, fecha y resultado y conserva los filtros al paginar", async ({
  page,
}) => {
  const tabla = page.getByRole("region", { name: "Tabla de eventos" });
  await aplicarFiltros(page, "2026-11-22", "2026-11-22", "Resultado", "AUTORIZADO");

  await expect(tabla.getByRole("row")).toHaveCount(21);
  await expect(tabla.getByRole("cell", { name: placa, exact: true })).toHaveCount(20);
  await expect(tabla.getByRole("cell", { name: "Registro 21", exact: true })).toBeVisible();
  await expect(tabla.getByRole("cell", { name: "Registro 1", exact: true })).toHaveCount(0);
  await expect(tabla.getByText(/Otra placa|Otro resultado|Otro día/)).toHaveCount(0);

  const siguiente = page.getByRole("button", { name: "Siguiente" });
  await siguiente.click();
  await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
  await expect(tabla.getByRole("row")).toHaveCount(2);
  await expect(tabla.getByRole("cell", { name: "Registro 1", exact: true })).toBeVisible();
  await expect(siguiente).toBeDisabled();

  await page.getByRole("button", { name: "Anterior" }).click();
  await expect(page.getByText("Página 1", { exact: true })).toBeVisible();
  await expect(tabla.getByRole("cell", { name: "Registro 21", exact: true })).toBeVisible();
});

test("CARQ-224: filtra cobros por placa, día operativo y estado y conserva los filtros al paginar", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Cobros", exact: true }).click();
  const tabla = page.getByRole("region", { name: "Tabla de cobros" });
  await aplicarFiltros(page, "2026-11-01", "2026-11-23", "Estado", "PENDIENTE");

  await expect(tabla.getByRole("row")).toHaveCount(21);
  await expect(tabla.getByRole("cell", { name: placa, exact: true })).toHaveCount(20);
  await expect(tabla.getByText("Cobro pendiente", { exact: true })).toHaveCount(20);
  await expect(tabla.getByText(/2026-11-2[234]|2026-11-01/)).toHaveCount(0);
  await expect(tabla.getByText("2026-11-21", { exact: true })).toBeVisible();

  const siguiente = page.getByRole("button", { name: "Siguiente" });
  await siguiente.click();
  await expect(page.getByText("Página 2", { exact: true })).toBeVisible();
  await expect(tabla.getByRole("row")).toHaveCount(2);
  await expect(tabla.getByText("2026-11-01", { exact: true })).toBeVisible();
  await expect(siguiente).toBeDisabled();
});
