# 📋 GUIA DE MIGRAÇÃO - Sistema V1 → V2

## Visão Geral da Nova Arquitetura

A nova arquitetura transforma o sistema de multi-tenant simples em um **SaaS corporativo completo** com hierarquia organizacional flexível e permissões granulares.

---

## 📊 Principais Mudanças

### **1. Estrutura Hierárquica**
**Antes (V1):**
```
DEV → COMPANY → STORE → ADMIN → USER
(Hierarquia fixa de 5 níveis)
```

**Depois (V2):**
```
Company
  └── Usuários com hierarquia dinâmica (superiorId)
      └── Subordinados ilimitados
      └── Departamentos customizáveis
      └── Cargos/permissões personalizáveis
```

### **2. Sistema de Permissões**
**Antes:** Baseado em roles fixos (DEV, COMPANY, ADMIN, SUPPORT, USER)  
**Depois:** Permissões granulares customizáveis por empresa

### **2.1 Autenticação**
**Antes (V1):** login custom client-side baseado em collections legadas.

**Depois (V2):** Firebase Auth via **custom token** emitido pela callable `loginWithPassword`.

**Implicação chave:**
- O `uid` autenticado ($request.auth.uid$) deve ser o **docId** do usuário em `users/{userId}`.

### **3. Fluxo de Tarefas**
**Antes:** Tarefas simples com status linear  
**Depois:** Fluxo hierárquico com escalação automática

---

## 🔄 Mapeamento de Dados

### Companies (mantém compatibilidade parcial)
```typescript
// V1
companies {
  id, name, adminUsername, adminPassword, 
  passwordSalt, createdAt, isSuspended
}

// V2 (adiciona)
companies {
  + slug: string
  + ownerId: string
  + plan: 'free' | 'starter' | 'professional' | 'enterprise'
  + maxUsers: number
  + settings: { allowCrossDeptComm, requireTaskApproval, enableAuditLog }
  + metadata: { createdAt, updatedAt, suspendedAt, suspensionReason }
}
```

### Stores → Departments
```typescript
// V1
stores {
  id, companyId, name, adminUsername, 
  adminPassword, isBlocked
}

// V2 (novo conceito)
departments {
  id, companyId, name, description,
  leaderId, fallbackLeaderId, 
  parentDepartmentId, isActive
}
```

### Users (reestruturação completa)
```typescript
// V1 (stores_config.teamMembers)
{
  username, password, name, phone, storeId
}

// V2 (nova estrutura)
users {
  id, companyId, username, email, name,
  password, passwordSalt,
  roleId,              // ← Novo: cargo customizável
  departmentId,        // ← Novo: departamento
  superiorId,          // ← Novo: define hierarquia
  hierarchyPath: [],   // ← Novo: otimização de consultas
  hierarchyLevel: 0,   // ← Novo: profundidade na árvore
  status: UserStatus,  // ← Novo: active/inactive/suspended
  isOnline: boolean,   // ← Novo: presença em tempo real
  lastSeenAt: number
}
```

### Tasks (refatoração)
```typescript
// V1
tasks {
  id, storeId, title, responsible, priority,
  deadline, status, checklist, createdAt
}

// V2
tasks_v2 {
  id, companyId,
  assignedToUserId,        // ← Novo: tarefa pessoal
  assignedToDepartmentId,  // ← Novo: tarefa de setor
  createdById,
  title, description, priority, status, dueDate,
  flowType: TaskFlowType,  // ← Novo: tipo de fluxo hierárquico
  escalationPath: [],      // ← Novo: caminho de escalação
  version: number,         // ← Novo: controle de concorrência
  history: []              // ← Novo: auditoria completa
}
```

---

## 🚀 Plano de Migração

### **Fase 1: Preparação (Semana 1)**
- [ ] Criar collections V2 em paralelo às V1
- [ ] Implementar script de migração de dados
- [ ] Configurar Firestore Rules V2
- [ ] Habilitar Firebase Authentication
- [ ] Deploy das Cloud Functions (callable `loginWithPassword`)
- [ ] Testes unitários dos novos serviços

### **Fase 2: Migração de Dados (Semana 2)**
```javascript
// Script de migração (executar localmente)
async function migrateV1ToV2() {
  // 1. Migra Companies (mantém ids)
  // 2. Cria Departments baseado em Stores
  // 3. Cria Roles padrão por empresa
  // 4. Migra Users com hierarquia inicial
  // 5. Migra Tasks para tasks_v2
}
```

### **Fase 3: Testes Paralelos (Semana 3)**
- [ ] Sistema V1 continua rodando
- [ ] Sistema V2 roda em ambiente de teste
- [ ] Validação de funcionalidades
- [ ] Correção de bugs

### **Fase 4: Switch (Semana 4)**
- [ ] Deploy do frontend V2
- [ ] Ativação das Firestore Rules V2
- [ ] Deploy das Cloud Functions (login + automações/push)
- [ ] Monitoramento 24/7
- [ ] Rollback disponível se necessário

---

## 🧪 Testes Recomendados

### **1. Testes de Autorização**
```typescript
// AuthorizationService.test.ts
test('Usuário sem permissão não pode criar tarefa descendente')
test('Superior pode visualizar tarefas de subordinados')
test('Tarefa escala corretamente na hierarquia')
test('Comunicação entre departamentos respeita regras')
test('Líder pode mover tarefas do departamento')
```

### **2. Testes de Hierarquia**
```typescript
// HierarchyService.test.ts
test('Desativar usuário realoca subordinados')
test('Mover usuário recalcula hierarchyPath')
test('Detecta ciclos na hierarquia')
test('Valida integridade da hierarquia')
test('Fallback leader assume quando líder sai')
```

### **3. Testes de Kanban**
```typescript
// KanbanService.test.ts
test('Movimentação simultânea gera conflito de versão')
test('Lock distribuído previne race conditions')
test('Apenas dono pode mover tarefa pessoal')
test('Apenas líder pode mover tarefa de departamento')
```

### **4. Testes de Real-time**
```typescript
// RealtimeService.test.ts
test('Listener de tarefas pessoais recebe atualizações')
test('Notificações chegam em tempo real')
test('Presença online atualiza corretamente')
test('Listeners são removidos ao desinscrever')
```

---

## 📦 Collections V2

```
companies/
departments/
roles/
users/
tasks_v2/
task_comments/
department_communications/
audit_logs/
realtime_notifications/
distributed_locks/
user_sessions/
```

---

## 🔐 Segurança

### **Pontos Críticos**
1. **Isolamento por Empresa**: Sempre validar `companyId`
2. **Hierarquia**: Validar `hierarchyPath` antes de operações
3. **Permissões**: Backend sempre decide (nunca confiar no frontend)
4. **Auditoria**: Todos os eventos sensíveis vão para `audit_logs`

### **Firestore Rules**
- V2 rules são muito mais restritivas
- Validam permissões granulares
- Impedem vazamento entre empresas
- Logs são imutáveis

### **Auth + Rules (essencial)**
- As rules V2 dependem de `request.auth`.
- O login V2 autentica via Firebase Auth (custom token), então `request.auth.uid` passa a existir.
- A callable `loginWithPassword` busca o usuário em `users` por `username` e valida `companyId`.

---

## 🎯 Métricas de Sucesso

- **Performance**: Queries < 500ms (95 percentil)
- **Disponibilidade**: 99.9% uptime
- **Escalabilidade**: Suportar 1000+ usuários/empresa
- **Segurança**: Zero vazamentos entre empresas
- **Real-time**: Latência < 200ms para notificações

---

## 🚨 Rollback Plan

Se necessário reverter:
1. Reverter para o último release/commit estável no Git
2. Re-deploy de `firestore:rules` e `functions` conforme a versão revertida
4. Análise post-mortem
5. Correção e nova tentativa

---

## 📚 Documentação Adicional

- `types-v2.ts` - Todas as interfaces da nova arquitetura
- `AuthorizationService.ts` - Governança e permissões
- `HierarchyService.ts` - Gestão hierárquica
- `KanbanService.ts` - Controle de concorrência
- `TaskService.ts` - Criação e fluxo de tarefas
- `RealtimeService.ts` - Sincronização em tempo real
- `firestore-v2.rules` - Regras de segurança

---

## 💡 Próximos Passos

1. Revisar e aprovar esta proposta
2. Criar branch `feature/v2-architecture`
3. Implementar script de migração
4. Executar testes locais
5. Deploy em ambiente de staging
6. Testes de aceitação
7. Deploy em produção

---

## ❓ FAQ

**P: Os dados V1 serão perdidos?**  
R: Não, a migração copia dados para V2 mantendo V1 intacto.

**P: É possível voltar para V1?**  
R: Sim, durante as primeiras semanas mantemos V1 disponível para rollback.

**P: Quanto tempo para migrar?**  
R: Estimativa de 4 semanas (preparação + migração + testes + deploy).

**P: Haverá downtime?**  
R: Não, a migração é feita em paralelo sem interromper V1.

**P: Como treinar usuários?**  
R: Interface V2 será similar à V1, com guias contextuais para novas funcionalidades.
