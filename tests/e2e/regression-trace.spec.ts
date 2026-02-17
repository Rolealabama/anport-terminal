import { test, expect, type Page } from '@playwright/test';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase.ts';
import { Status } from '../../types.ts';

type RunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

const REGRESSION_SUPERADMIN_USERNAME = 'testador de regressao';
const REGRESSION_SUPERADMIN_PASSWORD = 'testederegressao123@';
const REGRESSION_SUPPORT_USERNAME = 'suporte_regressao';
const REGRESSION_SUPPORT_PASSWORD = 'suporte_regressao@123';

const now = () => Date.now();

const makeRunId = () => {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `REG-${stamp}-${suffix}`;
};

async function waitForDocExists(collectionName: string, id: string, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snap = await getDoc(doc(db, collectionName, id));
    if (snap.exists()) return snap;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return getDoc(doc(db, collectionName, id));
}

async function registerEvent(runId: string, stage: string, status: 'START' | 'OK' | 'FAIL', details: Record<string, unknown> = {}) {
  await addDoc(collection(db, 'regression_runs', runId, 'events'), {
    stage,
    status,
    details,
    timestamp: now()
  });
}

async function upsertRun(runId: string, payload: Record<string, unknown>) {
  await setDoc(doc(db, 'regression_runs', runId), payload, { merge: true });
}

async function finalizeRun(runId: string, status: RunStatus, payload: Record<string, unknown> = {}) {
  await updateDoc(doc(db, 'regression_runs', runId), {
    status,
    finishedAt: now(),
    ...payload
  });
}

async function login(page: Page, username: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('USUÁRIO').fill(username);
  await page.getByPlaceholder('SENHA').fill(password);
  await page.getByRole('button', { name: /Acessar Terminal/i }).click();
}

async function ensureRegressionSuperAdmin(runId: string) {
  await registerEvent(runId, 'ENSURE_REGRESSION_SUPERADMIN', 'START');

  const querySnap = await getDocs(
    query(collection(db, 'super_admin_users'), where('username', '==', REGRESSION_SUPERADMIN_USERNAME))
  );

  if (querySnap.empty) {
    await setDoc(doc(db, 'super_admin_users', 'testador_de_regressao'), {
      username: REGRESSION_SUPERADMIN_USERNAME,
      name: 'Testador de Regressão',
      password: REGRESSION_SUPERADMIN_PASSWORD,
      role: 'superadmin',
      isActive: true,
      createdAt: now(),
      createdBy: 'regression-trace.spec'
    }, { merge: true });
  }

  await registerEvent(runId, 'ENSURE_REGRESSION_SUPERADMIN', 'OK', {
    exists: !querySnap.empty,
    username: REGRESSION_SUPERADMIN_USERNAME
  });
}

async function getNextRegressionSequence() {
  const storesSnap = await getDocs(collection(db, 'stores'));
  let highest = 0;

  storesSnap.docs.forEach((storeDoc) => {
    const name = String(storeDoc.data().name || '').toLowerCase();
    const match = name.match(/^testes de regressao\s+(\d+)$/i);
    if (!match) return;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > highest) highest = value;
  });

  return highest + 1;
}

async function ensureRegressionSupport(runId: string, companyId: string) {
  await registerEvent(runId, 'ENSURE_REGRESSION_SUPPORT', 'START');

  await setDoc(doc(db, 'support_users', REGRESSION_SUPPORT_USERNAME), {
    username: REGRESSION_SUPPORT_USERNAME,
    name: 'Suporte de Regressão',
    role: 'support',
    password: REGRESSION_SUPPORT_PASSWORD,
    isActive: true,
    companyId,
    canCreateCompany: false,
    createdAt: now(),
    createdBy: 'regression-trace.spec'
  }, { merge: true });

  await registerEvent(runId, 'ENSURE_REGRESSION_SUPPORT', 'OK', {
    supportUsername: REGRESSION_SUPPORT_USERNAME,
    companyId
  });
}

async function openSupportTab(page: Page) {
  const supportButton = page.getByRole('button', { name: /^📤\s*Suporte$/i });
  if (await supportButton.count()) {
    await supportButton.first().click();
    return;
  }
  await page.getByRole('button', { name: /Suporte/i }).first().click();
}

async function waitForTicketByTitle(createdBy: string, companyId: string, title: string, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snap = await getDocs(
      query(
        collection(db, 'support_tickets'),
        where('createdBy', '==', createdBy),
        where('companyId', '==', companyId),
        where('title', '==', title)
      )
    );
    if (!snap.empty) return snap.docs[0];
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const snap = await getDocs(
    query(
      collection(db, 'support_tickets'),
      where('createdBy', '==', createdBy),
      where('companyId', '==', companyId),
      where('title', '==', title)
    )
  );
  return snap.docs[0];
}

async function waitForTicketStatus(ticketId: string, expectedStatus: string, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snap = await getDoc(doc(db, 'support_tickets', ticketId));
    if (snap.exists() && (snap.data() as any)?.status === expectedStatus) {
      return snap;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return getDoc(doc(db, 'support_tickets', ticketId));
}

async function safeDelete(collectionName: string, id: string) {
  if (!id) return false;
  try {
    await deleteDoc(doc(db, collectionName, id));
    return true;
  } catch {
    return false;
  }
}

async function cleanupRegressionArtifacts(params: {
  runId: string;
  companyId: string;
  storeId: string;
  taskId: string;
  managerTicketId: string;
  userTicketId: string;
}) {
  const { runId, companyId, storeId, taskId, managerTicketId, userTicketId } = params;
  await registerEvent(runId, 'CLEANUP_ARTIFACTS', 'START');

  const cleanupResult = {
    supportUserDeleted: await safeDelete('support_users', REGRESSION_SUPPORT_USERNAME),
    managerTicketDeleted: await safeDelete('support_tickets', managerTicketId),
    userTicketDeleted: await safeDelete('support_tickets', userTicketId),
    taskDeleted: await safeDelete('tasks', taskId),
    storeConfigDeleted: await safeDelete('stores_config', storeId),
    storeDeleted: await safeDelete('stores', storeId),
    companyDeleted: await safeDelete('companies', companyId),
    cleanedAt: now()
  };

  await upsertRun(runId, {
    cleanup: cleanupResult,
    'assertions.cleanupDone': true
  });

  await registerEvent(runId, 'CLEANUP_ARTIFACTS', 'OK', cleanupResult);
}

test.describe.serial('Regression trace flow', () => {
  test('@regression complete end-to-end with database traceability', async ({ page }) => {
    test.setTimeout(180_000);

    const runId = makeRunId();
    const runRef = doc(db, 'regression_runs', runId);

    let stage = 'INIT';
    let companyId = '';
    let storeId = '';
    let managerUsername = '';
    let managerPassword = '';
    let collaboratorUsername = '';
    let collaboratorPassword = '';
    let taskId = '';
    let notificationId = '';
    let managerTicketId = '';
    let userTicketId = '';

    console.log(`[REGRESSION] ID DO TESTE DE REGRESSAO: ${runId}`);

    await upsertRun(runId, {
      runId,
      type: 'REGRESSION_TEST',
      status: 'RUNNING',
      startedAt: now(),
      triggeredBy: process.env.CI ? 'CI' : 'LOCAL',
      actors: {
        superAdminUsername: REGRESSION_SUPERADMIN_USERNAME
      },
      assertions: {
        loginOk: false,
        storeCreated: false,
        regressionTagCreated: false,
        userCreated: false,
        taskAssigned: false,
        taskCompleted: false,
        managerNotified: false,
        managerTicketOpened: false,
        userTicketOpened: false,
        supportResolvedOneTicket: false
      }
    });

    try {
      stage = 'ENSURE_REGRESSION_SUPERADMIN';
      await ensureRegressionSuperAdmin(runId);

      stage = 'LOGIN_SUPERADMIN';
      await registerEvent(runId, stage, 'START');
      await login(page, REGRESSION_SUPERADMIN_USERNAME, REGRESSION_SUPERADMIN_PASSWORD);
      await expect(page.getByText('PAINEL MASTER')).toBeVisible({ timeout: 20_000 });
      await upsertRun(runId, { 'assertions.loginOk': true });
      await registerEvent(runId, stage, 'OK');

      stage = 'CREATE_COMPANY';
      await registerEvent(runId, stage, 'START');
      const sequence = await getNextRegressionSequence();
      const storeDisplayName = `testes de regressao ${sequence}`;
      const stamp = `${sequence}${Date.now().toString().slice(-3)}`;
      companyId = `RG${stamp}`.slice(0, 10).toUpperCase();
      const companyUsername = `rgadm${stamp}`.slice(0, 15).toLowerCase();
      const companyPassword = `rg@${stamp}x`;

      await page.getByRole('button', { name: '+ Novo' }).click();
      const companyForm = page.locator('form').first();
      await companyForm.getByPlaceholder(/ID DA EMPRESA|ID \(EX: LOJA01\)/i).fill(companyId);
      await companyForm.getByPlaceholder('NOME DE EXIBIÇÃO').fill(`Corp ${storeDisplayName}`);
      await companyForm.getByPlaceholder(/USUÁRIO ADMIN|USUÁRIO/i).fill(companyUsername);
      await companyForm.getByPlaceholder('SENHA').fill(companyPassword);
      await companyForm.getByRole('button', { name: /Salvar na Nuvem/i }).click();
      await expect(page.getByText(companyId, { exact: true })).toBeVisible({ timeout: 20_000 });

      const companySnap = await waitForDocExists('companies', companyId);
      expect(companySnap.exists()).toBeTruthy();
      await registerEvent(runId, stage, 'OK', { companyId, companyUsername });

      stage = 'CREATE_STORE';
      await registerEvent(runId, stage, 'START');
      await page.getByRole('button', { name: 'Sair' }).click();
      await login(page, companyUsername, companyPassword);
      await expect(page.getByText('Gestão de Unidades')).toBeVisible({ timeout: 20_000 });

      const storeStamp = `${sequence}${Date.now().toString().slice(-3)}`;
      storeId = `TR${storeStamp}`.slice(0, 10).toUpperCase();
      managerUsername = `mgr${storeStamp}`.slice(0, 15).toLowerCase();
      managerPassword = `mgr@${storeStamp}x`;

      await page.getByRole('button', { name: '+ Novo' }).click();
      const storeForm = page.locator('form').first();
      await storeForm.getByPlaceholder(/ID DA LOJA|ID \(EX: LOJA01\)/i).fill(storeId);
      await storeForm.getByPlaceholder('NOME DE EXIBIÇÃO').fill(storeDisplayName);
      await storeForm.getByPlaceholder(/USUÁRIO ADMIN|USUÁRIO/i).fill(managerUsername);
      await storeForm.getByPlaceholder('SENHA').fill(managerPassword);
      const managerNameInput = storeForm.getByPlaceholder('NOME DO GERENTE');
      if (await managerNameInput.count()) {
        await managerNameInput.fill(`Gerente ${sequence}`);
      }
      await storeForm.getByRole('button', { name: /Salvar na Nuvem/i }).click();
      await expect(page.getByText(storeId, { exact: true })).toBeVisible({ timeout: 20_000 });

      const storeSnap = await waitForDocExists('stores', storeId);
      expect(storeSnap.exists()).toBeTruthy();
      await upsertRun(runId, {
        storeId,
        'assertions.storeCreated': true
      });
      await registerEvent(runId, stage, 'OK', { storeId, storeDisplayName });
      console.log(`[REGRESSION] ID DA LOJA CRIADA: ${storeId}`);

      stage = 'MARK_STORE_REGRESSION';
      await registerEvent(runId, stage, 'START');
      await updateDoc(doc(db, 'stores', storeId), {
        meta: {
          isRegressionTest: true,
          regressionRunId: runId,
          regressionType: 'REGRESSION_TEST',
          executionAt: now()
        }
      });

      const taggedStoreSnap = await getDoc(doc(db, 'stores', storeId));
      const taggedStore = taggedStoreSnap.data() as any;
      expect(taggedStore?.meta?.regressionRunId).toBe(runId);
      await upsertRun(runId, {
        'assertions.regressionTagCreated': true
      });
      await registerEvent(runId, stage, 'OK', { regressionRunId: runId });

      stage = 'CREATE_COLLABORATOR_BY_MANAGER';
      await registerEvent(runId, stage, 'START');
      await page.getByRole('button', { name: 'Sair' }).click();
      await login(page, managerUsername, managerPassword);
      await expect(page.getByText(`UNIDADE ${storeId}`)).toBeVisible({ timeout: 20_000 });

      const memberSuffix = `${sequence}${Date.now().toString().slice(-2)}`;
      const collaboratorName = `Colab ${memberSuffix}`;
      collaboratorUsername = `col${memberSuffix}`.slice(0, 15).toLowerCase();
      collaboratorPassword = `col@${memberSuffix}x`;

      await page.getByRole('button', { name: 'Equipe' }).click();
      await page.getByRole('button', { name: /Configurar Agora|Editar Equipe/i }).click();
      await page.getByPlaceholder('Ex: João Silva').fill(collaboratorName);
      await page.getByPlaceholder('Ex: joao_silva').fill(collaboratorUsername);
      await page.getByPlaceholder(/Mínimo 6 caracteres|Deixar vazio = não alterar/i).fill(collaboratorPassword);
      await page.getByPlaceholder('(11) 99999-9999').fill('(11) 98888-7777');
      await page.getByRole('button', { name: /Adicionar Membro/i }).click();
      await page.getByRole('button', { name: /Salvar Unidade/i }).click();
      await expect(page.getByRole('button', { name: /Salvar Unidade/i })).toBeHidden({ timeout: 20_000 });

      const configSnap = await getDoc(doc(db, 'stores_config', storeId));
      expect(configSnap.exists()).toBeTruthy();
      const teamMembers = (configSnap.data() as any)?.teamMembers || [];
      const createdMember = teamMembers.find((member: any) => member.username === collaboratorUsername);
      expect(!!createdMember).toBeTruthy();
      await upsertRun(runId, {
        managerId: managerUsername,
        userId: collaboratorUsername,
        'assertions.userCreated': true
      });
      await registerEvent(runId, stage, 'OK', {
        managerUsername,
        collaboratorUsername
      });
      console.log(`[REGRESSION] ID DO GERENTE: ${managerUsername}`);
      console.log(`[REGRESSION] ID DO USUÁRIO: ${collaboratorUsername}`);

      stage = 'CREATE_TASK_BY_MANAGER';
      await registerEvent(runId, stage, 'START');
      await page.getByRole('button', { name: 'Operação' }).click();
      await page.getByRole('button', { name: /Nova Tarefa/i }).click();

      const taskTitle = `Tarefa regressão ${runId}`;
      const taskForm = page.locator('form', { has: page.getByPlaceholder('O que precisa ser feito?') });
      await taskForm.getByPlaceholder('O que precisa ser feito?').fill(taskTitle);
      await taskForm.getByPlaceholder('Ex: Conferir data de validade').fill('Checklist de regressão');
      await taskForm.getByRole('button', { name: '+' }).click();
      await taskForm.locator('select').first().selectOption({ label: collaboratorName });
      await taskForm.getByRole('button', { name: /Lançar Tarefa/i }).click();

      const createdTaskCard = page.locator('div', { hasText: taskTitle }).first();
      await expect(createdTaskCard).toBeVisible({ timeout: 20_000 });

      const taskQuerySnap = await getDocs(query(collection(db, 'tasks'), where('storeId', '==', storeId), where('title', '==', taskTitle)));
      expect(taskQuerySnap.empty).toBeFalsy();
      taskId = taskQuerySnap.docs[0].id;
      await upsertRun(runId, {
        taskId,
        'assertions.taskAssigned': true
      });
      await registerEvent(runId, stage, 'OK', { taskId, taskTitle });
      console.log(`[REGRESSION] ID DA TAREFA: ${taskId}`);

      stage = 'COLLABORATOR_COMPLETE_TASK';
      await registerEvent(runId, stage, 'START');
      await page.getByRole('button', { name: 'Sair' }).click();
      await login(page, collaboratorUsername, collaboratorPassword);
      await expect(page.getByText(`UNIDADE ${storeId}`)).toBeVisible({ timeout: 20_000 });

      const collaboratorTaskCard = page.locator('div', { hasText: taskTitle }).first();
      await expect(collaboratorTaskCard).toBeVisible({ timeout: 20_000 });
      await collaboratorTaskCard.getByRole('button', { name: /Iniciar Atividade/i }).click();
      await collaboratorTaskCard.getByText('Checklist de regressão').click();
      await collaboratorTaskCard.getByRole('button', { name: /Concluir Missão/i }).click();

      const completeForm = page.locator('form', { has: page.getByPlaceholder('Descreva brevemente...') });
      await completeForm.getByPlaceholder('Descreva brevemente...').fill(`Concluído pelo fluxo ${runId}`);
      await completeForm.locator('input[type="file"]').setInputFiles('tests/e2e/fixtures/proof.svg');
      await completeForm.getByRole('button', { name: /Finalizar Missão/i }).click();

      await expect(page.getByRole('button', { name: /Ver Comprovante/i })).toBeVisible({ timeout: 20_000 });
      const finalTaskSnap = await waitForDocExists('tasks', taskId);
      expect(finalTaskSnap.exists()).toBeTruthy();
      expect((finalTaskSnap.data() as any)?.status).toBe(Status.DONE);
      await upsertRun(runId, {
        taskStatus: Status.DONE,
        'assertions.taskCompleted': true
      });
      await registerEvent(runId, stage, 'OK', { taskId, taskStatus: Status.DONE });

      stage = 'MANAGER_NOTIFICATION_VALIDATION';
      await registerEvent(runId, stage, 'START');
      await page.getByRole('button', { name: 'Sair' }).click();
      await login(page, managerUsername, managerPassword);
      await expect(page.getByText(`UNIDADE ${storeId}`)).toBeVisible({ timeout: 20_000 });

      await page.getByRole('button', { name: 'Operação' }).click();
      const managerTaskCard = page.locator('div', { hasText: taskTitle }).first();
      await expect(managerTaskCard).toBeVisible({ timeout: 20_000 });
      await expect(managerTaskCard.getByRole('button', { name: /Ver Comprovante/i })).toBeVisible({ timeout: 20_000 });

      notificationId = `task-status-${taskId}`;
      await upsertRun(runId, {
        notificationId,
        notificationConfirmed: true,
        'assertions.managerNotified': true
      });
      await registerEvent(runId, stage, 'OK', { notificationId });

      stage = 'ENSURE_REGRESSION_SUPPORT';
      await ensureRegressionSupport(runId, companyId);
      console.log(`[REGRESSION] ID DO SUPORTE: ${REGRESSION_SUPPORT_USERNAME}`);

      stage = 'MANAGER_OPEN_SUPPORT_TICKET';
      await registerEvent(runId, stage, 'START');
      await openSupportTab(page);
      const managerTicketTitle = `Ticket Gerente ${runId}`;
      await page.getByPlaceholder(/Ex: Erro ao gerar relatório/i).fill(managerTicketTitle);
      await page.getByPlaceholder(/Descreva sua dúvida ou o bug/i).fill('Problema reportado pelo gerente no fluxo de regressão.');
      await page.getByRole('button', { name: /ENVIAR TICKET/i }).click();
      await expect(page.getByText(/Ticket enviado com sucesso!/i)).toBeVisible({ timeout: 20_000 });

      const managerTicketDoc = await waitForTicketByTitle(managerUsername, companyId, managerTicketTitle);
      expect(managerTicketDoc?.id).toBeTruthy();
      managerTicketId = managerTicketDoc.id;
      await upsertRun(runId, {
        managerTicketId,
        'assertions.managerTicketOpened': true
      });
      await registerEvent(runId, stage, 'OK', { managerTicketId, managerTicketTitle });

      stage = 'USER_OPEN_SUPPORT_TICKET';
      await registerEvent(runId, stage, 'START');
      await page.getByRole('button', { name: 'Sair' }).click();
      await login(page, collaboratorUsername, collaboratorPassword);
      await expect(page.getByText(`UNIDADE ${storeId}`)).toBeVisible({ timeout: 20_000 });
      await openSupportTab(page);

      const userTicketTitle = `Ticket Usuario ${runId}`;
      await page.getByPlaceholder(/Ex: Erro ao gerar relatório/i).fill(userTicketTitle);
      await page.getByPlaceholder(/Descreva sua dúvida ou o bug/i).fill('Problema reportado pelo usuário no fluxo de regressão.');
      await page.getByRole('button', { name: /ENVIAR TICKET/i }).click();
      await expect(page.getByText(/Ticket enviado com sucesso!/i)).toBeVisible({ timeout: 20_000 });

      const userTicketDoc = await waitForTicketByTitle(collaboratorUsername, companyId, userTicketTitle);
      expect(userTicketDoc?.id).toBeTruthy();
      userTicketId = userTicketDoc.id;
      await upsertRun(runId, {
        userTicketId,
        'assertions.userTicketOpened': true
      });
      await registerEvent(runId, stage, 'OK', { userTicketId, userTicketTitle });

      stage = 'SUPPORT_RESOLVE_MANAGER_TICKET';
      await registerEvent(runId, stage, 'START');
      await page.getByRole('button', { name: 'Sair' }).click();
      await login(page, REGRESSION_SUPPORT_USERNAME, REGRESSION_SUPPORT_PASSWORD);
      await expect(page.getByText('PAINEL DE SUPORTE')).toBeVisible({ timeout: 20_000 });

      const searchInput = page.getByPlaceholder(/Buscar por título|Buscar por título, descrição/i);
      await searchInput.fill(`Ticket Gerente ${runId}`);
      const supportTicketCard = page
        .getByRole('heading', { name: `Ticket Gerente ${runId}` })
        .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
      await expect(supportTicketCard).toBeVisible({ timeout: 20_000 });
      await supportTicketCard.locator('select').last().selectOption('resolvido');

      const resolvedTicketSnap = await waitForTicketStatus(managerTicketId, 'resolvido', 20_000);
      expect((resolvedTicketSnap.data() as any)?.status).toBe('resolvido');
      await upsertRun(runId, {
        resolvedTicketId: managerTicketId,
        'assertions.supportResolvedOneTicket': true
      });
      await registerEvent(runId, stage, 'OK', { resolvedTicketId: managerTicketId });

      await finalizeRun(runId, 'SUCCESS', {
        result: 'SUCESSO',
        artifacts: {
          companyId,
          storeId,
          supportId: REGRESSION_SUPPORT_USERNAME,
          managerId: managerUsername,
          userId: collaboratorUsername,
          taskId,
          notificationId,
          managerTicketId,
          userTicketId,
          resolvedTicketId: managerTicketId
        }
      });

      const runSnap = await getDoc(runRef);
      expect(runSnap.exists()).toBeTruthy();
      expect((runSnap.data() as any)?.status).toBe('SUCCESS');

      console.log(`[REGRESSION] ID DO TESTE DE REGRESSAO: ${runId}`);
      console.log(`[REGRESSION] ID DA LOJA CRIADA: ${storeId}`);
      console.log(`[REGRESSION] ID DO GERENTE: ${managerUsername}`);
      console.log(`[REGRESSION] ID DO USUÁRIO: ${collaboratorUsername}`);
      console.log(`[REGRESSION] ID DO SUPORTE: ${REGRESSION_SUPPORT_USERNAME}`);
      console.log(`[REGRESSION] ID DA TAREFA: ${taskId}`);
      console.log(`[REGRESSION] ID TICKET GERENTE: ${managerTicketId}`);
      console.log(`[REGRESSION] ID TICKET USUÁRIO: ${userTicketId}`);
      console.log(`[REGRESSION] RESULTADO FINAL DO TESTE: SUCESSO`);

      await cleanupRegressionArtifacts({
        runId,
        companyId,
        storeId,
        taskId,
        managerTicketId,
        userTicketId
      });
    } catch (error) {
      await registerEvent(runId, stage, 'FAIL', {
        message: error instanceof Error ? error.message : String(error)
      });

      await finalizeRun(runId, 'FAILED', {
        result: 'FALHA',
        error: {
          stage,
          message: error instanceof Error ? error.message : String(error)
        },
        artifacts: {
          companyId,
          storeId,
          supportId: REGRESSION_SUPPORT_USERNAME,
          managerId: managerUsername,
          userId: collaboratorUsername,
          taskId,
          notificationId,
          managerTicketId,
          userTicketId,
          resolvedTicketId: managerTicketId
        }
      });

      console.log(`[REGRESSION] ID DO TESTE DE REGRESSAO: ${runId}`);
      console.log(`[REGRESSION] RESULTADO FINAL DO TESTE: FALHA`);

      await cleanupRegressionArtifacts({
        runId,
        companyId,
        storeId,
        taskId,
        managerTicketId,
        userTicketId
      });

      throw error;
    }
  });
});
