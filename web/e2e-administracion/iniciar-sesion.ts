import { expect, type Page } from "@playwright/test";

export async function iniciarSesion(
  page: Page,
  usuario: "administrador" | "operador",
) {
  await page.goto("/login");
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña", { exact: true }).fill(`${usuario}123`);
  await page.getByRole("button", { name: "Ingresar a mi espacio" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}
