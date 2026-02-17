import { test, expect } from '@playwright/test';

test.describe.serial('admin flow', () => {
  test('company -> store -> tasks -> feedback -> cleanup', async ({ page }) => {
    const dialogMessages: string[] = [];
    page.on('dialog', (dialog) => {
      dialogMessages.push(dialog.message());
      dialog.accept();
    });

    const suffix = Date.now().toString().slice(-6);
    const companyId = `C${suffix}`;
    const companyUser = `adm${suffix.slice(-4)}`;
    const companyPass = `pass${suffix}`;
    const storeId = `L${suffix}`;
    const storeUser = `loj${suffix.slice(-4)}`;
    const storePass = `pass${suffix}1`;
    const memberName = `Colab ${suffix}`;
    const memberUser = `col${suffix.slice(-4)}`;
    const memberPass = `senha${suffix}`;
    const taskTitle = `Auditoria ${suffix}`;

    const login = async (username: string, password: string) => {
      await page.goto('/');
      await page.getByPlaceholder('USUÁRIO').fill(username);
      await page.getByPlaceholder('SENHA').fill(password);
      await page.getByRole('button', { name: /Acessar Terminal/i }).click();
    };

    // 1) Superadmin cria corporativa
    await login('superadmin', 'master123');
    await expect(page.getByText('PAINEL MASTER')).toBeVisible();

    await page.getByRole('button', { name: '+ Novo' }).click();
    const companyForm = page.locator('form').first();
    await companyForm.getByPlaceholder(/ID DA EMPRESA|ID \(EX: LOJA01\)/i).fill(companyId);
    await companyForm.getByPlaceholder('NOME DE EXIBIÇÃO').fill(`Empresa ${suffix}`);
    await companyForm.getByPlaceholder(/USUÁRIO ADMIN|USUÁRIO/i).fill(companyUser);
    await companyForm.getByPlaceholder('SENHA').fill(companyPass);
    await companyForm.getByRole('button', { name: /Salvar na Nuvem/i }).click();
    await expect(page.getByText(companyId, { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Sair' }).click();

    // 2) Company admin cria loja
    await login(companyUser, companyPass);
    await expect(page.getByText('Gestão de Unidades')).toBeVisible();

    await page.getByRole('button', { name: '+ Novo' }).click();
    const storeForm = page.locator('form').first();
    await storeForm.getByPlaceholder(/ID DA LOJA|ID \(EX: LOJA01\)/i).fill(storeId);
    await storeForm.getByPlaceholder('NOME DE EXIBIÇÃO').fill(`Unidade ${suffix}`);
    await storeForm.getByPlaceholder(/USUÁRIO ADMIN|USUÁRIO/i).fill(storeUser);
    await storeForm.getByPlaceholder('SENHA').fill(storePass);
    await storeForm.getByPlaceholder('NOME DO GERENTE').fill('Gerente Teste');
    await storeForm.getByRole('button', { name: /Salvar na Nuvem/i }).click();
    await expect(page.getByText(storeId, { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Sair' }).click();

    // 3) Store admin configura equipe
    await login(storeUser, storePass);
    await expect(page.getByText(`UNIDADE ${storeId}`)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Equipe' }).click();
    const teamCta = page.getByRole('button', { name: /Configurar Agora|Editar Equipe/i });
    await teamCta.click();

    await page.getByPlaceholder('Ex: João Silva').fill(memberName);
    await page.getByPlaceholder('Ex: joao_silva').fill(memberUser);
    await page.getByPlaceholder('Mínimo 6 caracteres').fill(memberPass);
    await page.getByPlaceholder('(11) 99999-9999').fill('(11) 99999-9999');
    await page.getByRole('button', { name: /Adicionar Membro/i }).click();

    await page.getByRole('button', { name: /Salvar Unidade/i }).click();
    await expect(page.getByRole('button', { name: /Salvar Unidade/i })).toBeHidden({ timeout: 15_000 });

    // 4) Cria tarefa
    await page.getByRole('button', { name: 'Operação' }).click();
    await page.getByRole('button', { name: /Nova Tarefa/i }).click();

    const taskForm = page.locator('form', { has: page.getByPlaceholder('O que precisa ser feito?') });
    await taskForm.getByPlaceholder('O que precisa ser feito?').fill(taskTitle);
    await taskForm.getByPlaceholder('Ex: Conferir data de validade').fill('Checar estoque');
    await taskForm.getByRole('button', { name: '+' }).click();
    await taskForm.locator('select').first().selectOption({ label: memberName });
    await taskForm.getByRole('button', { name: /Lançar Tarefa/i }).click();

    const taskCard = page.locator('div', { hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 15_000 });

    await taskCard.getByRole('button', { name: /Iniciar Atividade/i }).click();
    await taskCard.getByRole('button', { name: /Concluir Missão/i }).click();
    await expect.poll(() => dialogMessages.some(m => m.includes('Conclua o checklist'))).toBeTruthy();
    await taskCard.getByText('Checar estoque').click();
    await taskCard.getByRole('button', { name: /Concluir Missão/i }).click();

    const completeForm = page.locator('form', { has: page.getByPlaceholder('Descreva brevemente...') });
    await completeForm.getByPlaceholder('Descreva brevemente...').fill('Concluido via E2E');
    await completeForm.locator('input[type="file"]').setInputFiles('tests/e2e/fixtures/proof.svg');
    await completeForm.getByRole('button', { name: /Finalizar Missão/i }).click();

    await expect(page.getByRole('button', { name: /Ver Comprovante/i })).toBeVisible({ timeout: 15_000 });

    // 5) Relatorios
    await page.getByRole('button', { name: 'Relatórios' }).click();
    await expect(page.getByText('Inteligência Operacional')).toBeVisible();
    await page.getByRole('button', { name: /Auditoria Visual/i }).click();
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 15_000 });

    // 6) Envia comunicado
    await page.getByRole('button', { name: 'Ouvidoria' }).click();
    await page.getByRole('button', { name: /Novo Comunicado/i }).click();

    const announceForm = page.locator('form', { has: page.getByPlaceholder('Título do Comunicado...') });
    await announceForm.getByPlaceholder('Título do Comunicado...').fill(`Aviso ${suffix}`);
    await announceForm.getByPlaceholder('Conteúdo do aviso...').fill('Mensagem de teste automatizado');
    await announceForm.getByRole('button', { name: /Publicar Aviso/i }).click();

    await expect(page.getByText(`Aviso ${suffix}`)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Sair' }).click();

    // 7) Cleanup: superadmin remove corporativa
    await login('superadmin', 'master123');
    await expect(page.getByText('PAINEL MASTER')).toBeVisible();

    await page.getByPlaceholder('BUSCAR...').fill(companyId);
    const companyCard = page.locator(`xpath=//span[normalize-space()="${companyId}"]/ancestor::div[contains(@class,"group")]`);
    await companyCard.hover();
    await companyCard.locator('button').last().click();
    await page.getByRole('button', { name: /Confirmar Exclusão/i }).click();

    await expect(page.getByText(companyId, { exact: true })).toBeHidden({ timeout: 20_000 });
  });
});
