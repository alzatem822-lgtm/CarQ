import { expect, test } from '@playwright/test';

test('muestra el formulario de inicio de sesión', async ({ page }) => {
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'Inicia tu sesión' }),
  ).toBeVisible();
  await expect(page.getByLabel('Usuario', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ingresar a mi espacio' }),
  ).toBeEnabled();
});
