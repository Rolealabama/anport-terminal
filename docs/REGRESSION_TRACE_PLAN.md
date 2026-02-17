# Plano de Regressão E2E com Rastreabilidade de Banco

## 1) Estratégia de implementação

### Estado atual observado
- Login superadmin é bypass fixo (`superadmin` / `master123`) em [components/Login.tsx](components/Login.tsx).
- Fluxo E2E principal já existe em [tests/e2e/admin-flow.spec.ts](tests/e2e/admin-flow.spec.ts).
- Config Playwright está em [playwright.config.ts](playwright.config.ts).
- Entidades principais (store, task, roles) estão tipadas em [types.ts](types.ts).

### Gap para o requisito do “Super Admin de Regressão”
Hoje não existe cadastro dinâmico de superadmin no app. Para cumprir exatamente o requisito:
- Opção A (recomendada): criar coleção `super_admin_users` e permitir login DEV também por banco.
- Opção B (rápida): manter bypass técnico (`superadmin`) e usar `testador de regressao` apenas como identificador de execução (não como conta real).

### Arquitetura recomendada da rastreabilidade
- Criar coleção principal: `regression_runs` (1 documento por execução).
- Criar subcoleção: `regression_runs/{runId}/events` (eventos do fluxo em ordem).
- Escrever status em tempo real: `RUNNING` -> `SUCCESS`/`FAILED`.
- Salvar IDs reais criados no Firestore em cada etapa.

## 2) Estrutura do teste automatizado (proposta)

Arquivo principal:
- `tests/e2e/regression-trace.spec.ts`

Helpers sugeridos:
- `tests/e2e/helpers/regressionTrace.ts` (cria run, registra evento, finaliza run)
- `tests/e2e/helpers/auth.ts` (login superadmin, gerente e colaborador)
- `tests/e2e/helpers/dbLookup.ts` (consultas de validação no banco)

Ordem de execução E2E:
1. gerar `runId`
2. garantir usuário de regressão (ou fallback técnico)
3. login superadmin
4. criar loja sequencial (`testes de regressao N`)
5. registrar marcação da loja como teste de regressão
6. login gerente
7. criar colaborador
8. criar tarefa
9. login colaborador
10. concluir tarefa
11. validar notificação no gerente
12. persistir resultado final (`SUCCESS`/`FAILED`)
13. (opcional) cleanup controlado

## 3) Modelo de rastreamento no banco

### Coleção: `regression_runs`
Documento `runId`:
- `runId: string`
- `type: 'REGRESSION_TEST'`
- `startedAt: number`
- `finishedAt?: number`
- `status: 'RUNNING' | 'SUCCESS' | 'FAILED'`
- `triggeredBy: string` (ex.: CI, local, usuário)
- `buildInfo: { commitSha?: string, branch?: string, ci?: boolean }`
- `actors: { superAdminUsername: string, managerUsername?: string, collaboratorUsername?: string }`
- `artifacts: { storeId?: string, companyId?: string, taskId?: string, notificationId?: string }`
- `assertions: {
    loginOk: boolean,
    storeCreated: boolean,
    regressionTagCreated: boolean,
    userCreated: boolean,
    taskAssigned: boolean,
    taskCompleted: boolean,
    managerNotified: boolean
  }`
- `error?: { stage: string, message: string, stack?: string }`

### Subcoleção: `regression_runs/{runId}/events`
Eventos por etapa:
- `timestamp: number`
- `stage: string` (LOGIN_SUPERADMIN, CREATE_STORE, CREATE_USER...)
- `status: 'START' | 'OK' | 'FAIL'`
- `entityType?: 'STORE' | 'USER' | 'TASK' | 'NOTIFICATION'`
- `entityId?: string`
- `details?: Record<string, any>`

### Marcação da loja como regressão
No documento da loja criada:
- `meta.isRegressionTest = true`
- `meta.regressionRunId = runId`
- `meta.regressionType = 'REGRESSION_TEST'`
- `meta.createdAt = Date.now()`

## 4) Campos necessários na “tabela” de auditoria

Se usar documento único (`regression_runs`), os campos mínimos obrigatórios são:
- `runId`
- `type`
- `startedAt`
- `finishedAt`
- `status`
- `storeId`
- `managerId`
- `collaboratorId`
- `taskId`
- `taskStatusFinal`
- `notificationConfirmed`
- `result`
- `errorStage` (se falha)
- `errorMessage` (se falha)

## 5) Exemplo de logs obrigatórios

```text
[REGRESSION] ID DO TESTE DE REGRESSAO: REG-20260216-212955-7F3A
[REGRESSION] SUPERADMIN: testador de regressao (ou fallback: superadmin)
[REGRESSION] LOJA CRIADA: store_abc123 | nome: testes de regressao 14
[REGRESSION] GERENTE: mgr_joao_14
[REGRESSION] USUARIO: col_maria_14
[REGRESSION] TAREFA: task_9x8y7z | status: A Fazer -> Em Andamento -> Concluído
[REGRESSION] NOTIFICACAO GERENTE: notif_77aa11 | confirmada=true
[REGRESSION] RESULTADO FINAL: SUCESSO
```

Exemplo em falha:
```text
[REGRESSION] ID DO TESTE DE REGRESSAO: REG-20260216-213112-1B4C
[REGRESSION] FALHA EM: VALIDATE_MANAGER_NOTIFICATION
[REGRESSION] MOTIVO: notificação de conclusão não encontrada em 20s
[REGRESSION] RESULTADO FINAL: FALHA
```

## 6) Pseudocódigo ponta-a-ponta

```pseudo
runId = generateRunId()
log("ID DO TESTE DE REGRESSAO: " + runId)
createRegressionRun(runId, status=RUNNING)

try:
  # 1) Super Admin de Regressão
  if superAdminDynamicSupported:
    exists = db.findSuperAdmin("testador de regressao")
    if not exists:
      db.createSuperAdmin(username="testador de regressao", password="testederegressao123@", role="superadmin")
    login("testador de regressao", "testederegressao123@")
  else:
    login("superadmin", "master123")
  assert loginSuccess
  event(OK, stage=LOGIN_SUPERADMIN)

  # 2) Criar loja sequencial
  seq = db.countStoresLike("testes de regressao %") + 1
  storeName = "testes de regressao " + seq
  createStore(storeName)
  storeId = captureStoreId()
  assert storeId exists
  event(OK, stage=CREATE_STORE, entity=STORE, id=storeId)

  # 3) Marcação no banco
  db.updateStoreMeta(storeId, {
    isRegressionTest: true,
    regressionRunId: runId,
    regressionType: "REGRESSION_TEST",
    executionAt: now()
  })
  assert db.store(storeId).meta.regressionRunId == runId
  event(OK, stage=MARK_STORE_REGRESSION)

  # 4.1) Criar gerente
  manager = createManagerForStore(storeId)
  assert manager.username exists
  event(OK, stage=CREATE_MANAGER, entity=USER, id=manager.username)

  # 4.2) Gerente cria usuário
  login(manager.username, manager.password)
  collaborator = managerCreatesCollaborator()
  assert collaborator.username exists
  event(OK, stage=CREATE_COLLABORATOR, entity=USER, id=collaborator.username)

  # 4.3) Gerente cria tarefa
  task = managerCreatesTask(responsible=collaborator.name)
  assert task.id exists
  event(OK, stage=CREATE_TASK, entity=TASK, id=task.id)

  # 4.4) Usuário executa fluxo
  login(collaborator.username, collaborator.password)
  assert userSeesTask(task.id)
  userCompletesTask(task.id)
  assert taskStatus(task.id) == DONE
  event(OK, stage=COMPLETE_TASK, entity=TASK, id=task.id)

  # 4.5) Validação notificação no gerente
  login(manager.username, manager.password)
  notification = assertManagerReceivedTaskDoneNotification(task.id)
  event(OK, stage=VALIDATE_NOTIFICATION, entity=NOTIFICATION, id=notification.id)

  finalizeRegressionRun(runId, SUCCESS, artifacts={storeId, manager, collaborator, task, notification})
  log("RESULTADO FINAL DO TESTE: SUCESSO")

catch err:
  event(FAIL, stage=currentStage, details=err.message)
  finalizeRegressionRun(runId, FAILED, error={stage: currentStage, message: err.message})
  log("RESULTADO FINAL DO TESTE: FALHA")
  throw err
```

## 7) Critérios de falha (aplicados no teste)

O teste deve `throw` imediatamente se:
- login falhar
- loja não for criada
- marcação de regressão não existir no banco
- usuário não receber tarefa
- tarefa não concluir
- gerente não receber notificação
- documento `regression_runs/{runId}` não for persistido

## 8) Próximo passo recomendado

Implementar em duas etapas para reduzir risco:
1. `regression-trace.spec.ts` + coleção `regression_runs` com fallback de login superadmin atual.
2. Evoluir autenticação para suportar superadmin dinâmico (`testador de regressao`) sem hardcode.
