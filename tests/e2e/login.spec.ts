import { test, expect } from '@playwright/test';

test('login screen renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByPlaceholder('USUÁRIO')).toBeVisible();
  await expect(page.getByPlaceholder('SENHA')).toBeVisible();
  await expect(page.getByRole('button', { name: /Acessar Terminal/i })).toBeVisible();
});

test('superadmin login opens dashboard and logout returns to login', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder('USUÁRIO').fill('superadmin');
  await page.getByPlaceholder('SENHA').fill('master123');
  await page.getByRole('button', { name: /Acessar Terminal/i }).click();

  await expect(page.getByText('PAINEL MASTER')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('SISTEMA / DEV')).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('button', { name: /Acessar Terminal/i })).toBeVisible();
});
