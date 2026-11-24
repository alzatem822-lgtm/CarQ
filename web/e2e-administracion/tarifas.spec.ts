import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./iniciar-sesion";

test("CARQ-223: Administración rechaza una tarifa nocturna mayor y conserva el importe anterior", async ({
  page,
}) => {
  await iniciarSesion(page, "administrador");
  await page.getByRole("link", { name: "Administración", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tarifas", exact: true })).toBeVisible();

  const diurna = page.locator('input[name="CARRO_DIURNA"]');
  const nocturna = page.locator('input[name="CARRO_NOCTURNA"]');
  const formulario = page.locator("form", { has: nocturna });
  await expect(diurna).toHaveValue("5000");
  await expect(nocturna).toHaveValue("3000");

  await nocturna.fill("6000");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(formulario.getByRole("alert")).toHaveText(
    "La tarifa nocturna de carros debe ser menor que la diurna.",
    { ignoreCase: true },
  );

  page.once("dialog", (dialogo) => dialogo.accept());
  await page.getByRole("button", { name: "Volver a cargar" }).click();
  await expect(diurna).toHaveValue("5000");
  await expect(nocturna).toHaveValue("3000");
  await expect(formulario.getByRole("alert")).toHaveCount(0);
});
