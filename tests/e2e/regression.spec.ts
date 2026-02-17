import { test, expect, type Page } from '@playwright/test';

const superAdminCredentials = {
  username: 'superadmin',
  password: 'master123'
};

async function loginAsSuperAdmin(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('USUÁRIO').fill(superAdminCredentials.username);
  await page.getByPlaceholder('SENHA').fill(superAdminCredentials.password);
  await page.getByRole('button', { name: /Acessar Terminal/i }).click();
}

test.describe('Regression Suite', () => {
  test('@regression login screen renders required fields', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByPlaceholder('USUÁRIO')).toBeVisible();
    await expect(page.getByPlaceholder('SENHA')).toBeVisible();
    await expect(page.getByRole('button', { name: /Acessar Terminal/i })).toBeVisible();
  });

  test('@regression invalid credentials shows error feedback', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('USUÁRIO').fill('usuario_invalido');
    await page.getByPlaceholder('SENHA').fill('senha_invalida');
    await page.getByRole('button', { name: /Acessar Terminal/i }).click();

    await expect(page.getByText('Credenciais inválidas.')).toBeVisible();
  });

  test('@regression superadmin login and logout flow', async ({ page }) => {
    await loginAsSuperAdmin(page);

    await expect(page.getByText('PAINEL MASTER')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('SISTEMA / DEV')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('button', { name: /Acessar Terminal/i })).toBeVisible();
  });

  test('@regression company creation modal open and cancel', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await expect(page.getByText('PAINEL MASTER')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: '+ Novo' }).click();

    await expect(page.getByPlaceholder(/ID DA EMPRESA|ID \(EX: LOJA01\)/i)).toBeVisible();
    await expect(page.getByPlaceholder('NOME DE EXIBIÇÃO')).toBeVisible();
    await expect(page.getByPlaceholder(/USUÁRIO|USUÁRIO ADMIN/i)).toBeVisible();
    await expect(page.getByPlaceholder('SENHA')).toBeVisible();

    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.getByPlaceholder(/ID DA EMPRESA|ID \(EX: LOJA01\)/i)).toBeHidden();
  });

  test('@regression company search input available after login', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await expect(page.getByText('PAINEL MASTER')).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder('BUSCAR...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('SEMAR');
    await expect(searchInput).toHaveValue('SEMAR');
  });
});
