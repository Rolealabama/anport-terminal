# 🧪 TESTE LOCAL - Sistema V2

## 🚀 Setup Rápido

### 1. Clone o Projeto
```bash
cd c:\Users\gabriela\Documents\projetoKamban
```

### 2. Instale Dependências
```bash
npm install
```

### 3. Configure Firebase (se ainda não fez)
Crie arquivo `.env` na raiz:
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 4. Inicie o Servidor de Desenvolvimento
```bash
npm run dev
```

### 5. Carregue Dados de Teste

Abra o console do navegador (F12) e execute:

```javascript
// OPÇÃO 1: Carregar dados de teste V2 (recomendado)
const { seedDatabase } = await import('./seed-data.ts');
await seedDatabase();

// OPÇÃO 2: Migrar dados V1 existentes para V2
const { runMigration } = await import('./migration-script.ts');
await runMigration();
```

---

## 👥 USUÁRIOS DE TESTE

Após executar `seedDatabase()`, você terá:

| Usuário | Senha | Role | Departamento | Nível |
|---------|-------|------|--------------|-------|
| `ceo` | senha123 | CEO | Financeiro | 0 (Topo) |
| `gerente.ti` | senha123 | Gerente | TI | 1 |
| `dev.senior` | senha123 | Analista | TI | 2 |
| `dev.junior` | senha123 | Assistente | TI | 3 |
| `gerente.rh` | senha123 | Gerente | RH | 1 |
| `analista.rh` | senha123 | Analista | RH | 2 |
| `assistente.rh` | senha123 | Assistente | RH | 3 |

**Hierarquia:**
```
CEO (Carlos)
  ├── Gerente TI (Maria)
  │   └── Dev Senior (João)
  │       └── Dev Junior (Pedro)
  │
  └── Gerente RH (Ana Paula)
      └── Analista RH (Beatriz)
          └── Assistente RH (Clara)
```

---

## 🧪 CENÁRIOS DE TESTE

### **Teste 1: Fluxo Hierárquico Descendente**

1. Login como `dev.senior`
2. Criar tarefa para `dev.junior`
3. ✅ **Esperado:** Tarefa criada (tem permissão TASK_CREATE_DOWN)

```typescript
// No console
import { TaskService } from './services/TaskService.ts';
import { TaskFlowType, TaskPriority } from './types-v2.ts';

await TaskService.createTask('user_dev_senior', {
  title: 'Corrigir bug no login',
  description: 'Login está falhando com emails longos',
  priority: TaskPriority.HIGH,
  flowType: TaskFlowType.DESCENDANT,
  assignedToUserId: 'user_dev_junior',
  checklist: [
    { text: 'Reproduzir o bug' },
    { text: 'Identificar causa raiz' },
    { text: 'Implementar correção' },
    { text: 'Testar em diferentes cenários' }
  ]
});
```

---

### **Teste 2: Fluxo Hierárquico Ascendente (Escalação)**

1. Login como `dev.junior`
2. Criar tarefa para `dev.senior` (seu superior)
3. ✅ **Esperado:** Tarefa criada (tem permissão TASK_CREATE_UP)

```typescript
await TaskService.createTask('user_dev_junior', {
  title: 'Preciso de code review',
  description: 'Implementei feature de notificações, precisa revisar',
  priority: TaskPriority.MEDIUM,
  flowType: TaskFlowType.ASCENDANT,
  assignedToUserId: 'user_dev_senior'
});
```

---

### **Teste 3: Comunicação Entre Departamentos (Permitida)**

1. Login como `dev.senior` (TI)
2. Criar tarefa para departamento RH
3. ✅ **Esperado:** Tarefa criada (regra permite TI → RH)

```typescript
await TaskService.createTask('user_dev_senior', {
  title: 'Criar campo de habilidades no cadastro',
  description: 'RH precisa de campo para skills técnicas',
  priority: TaskPriority.MEDIUM,
  flowType: TaskFlowType.TO_DEPARTMENT,
  assignedToDepartmentId: 'DEPT_RH'
});
```

---

### **Teste 4: Comunicação Entre Departamentos (Bloqueada + Escalação)**

1. Login como `dev.senior` (TI)
2. Tentar criar tarefa para departamento Financeiro
3. ⚠️ **Esperado:** Tarefa ESCALA para gerente.ti (que tem permissão)

```typescript
const result = await TaskService.createTask('user_dev_senior', {
  title: 'Integração com sistema contábil',
  description: 'Sincronizar dados financeiros',
  priority: TaskPriority.HIGH,
  flowType: TaskFlowType.TO_DEPARTMENT,
  assignedToDepartmentId: 'DEPT_FIN'
});

console.log('Escalado?', result.escalationPath);
// Deve mostrar: ['user_dev_senior', 'user_gerente_ti']
```

---

### **Teste 5: Controle de Concorrência no Kanban**

1. Abra 2 abas do navegador
2. Login como `dev.junior` em ambas
3. Tente mover a MESMA tarefa nas duas abas simultaneamente
4. ✅ **Esperado:** Uma aba mostra erro "Tarefa alterada por outro usuário"

```typescript
// Aba 1
import { KanbanService } from './services/KanbanService.ts';
import { TaskStatus } from './types-v2.ts';

await KanbanService.moveTask(
  'user_dev_junior',
  'task_001',
  TaskStatus.IN_PROGRESS,
  1  // versão atual
);

// Aba 2 (executar IMEDIATAMENTE depois)
await KanbanService.moveTask(
  'user_dev_junior',
  'task_001',
  TaskStatus.DONE,
  1  // mesma versão - vai falhar!
);
```

---

### **Teste 6: Desativação de Usuário com Subordinados**

1. Login como `ceo`
2. Desativar `dev.senior` (que tem 1 subordinado: `dev.junior`)
3. ✅ **Esperado:** `dev.junior` é realocado para `gerente.ti`

```typescript
import { HierarchyService } from './services/HierarchyService.ts';

await HierarchyService.deactivateUserSafely(
  'user_dev_senior',
  'user_ceo',
  'Desligamento voluntário'
);

// Verificar que dev.junior foi realocado
const devJunior = await getDoc(doc(db, 'users', 'user_dev_junior'));
console.log('Novo superior:', devJunior.data().superiorId);
// Deve mostrar: 'user_gerente_ti'
```

---

### **Teste 7: Lock Distribuído (Prevenção de Race Condition)**

1. Login como `gerente.ti` (líder do departamento TI)
2. Tentar mover tarefa de departamento
3. Em outra aba, tentar mover a mesma tarefa
4. ✅ **Esperado:** Segunda tentativa recebe "Tarefa sendo modificada"

```typescript
// Aba 1 (adicione um delay para simular operação lenta)
await KanbanService.moveTask('user_gerente_ti', 'task_002', TaskStatus.IN_PROGRESS, 1);

// Aba 2 (executar enquanto aba 1 está processando)
await KanbanService.moveTask('user_gerente_ti', 'task_002', TaskStatus.DONE, 1);
// ❌ Erro: "Tarefa sendo modificada por outro usuário"
```

---

### **Teste 8: Validação de Permissões**

1. Login como `dev.junior` (Assistente - permissões limitadas)
2. Tentar criar usuário novo
3. ❌ **Esperado:** Erro "Sem permissão para criar usuários"

```typescript
import { AuthorizationService } from './services/AuthorizationService.ts';

const hasPermission = await AuthorizationService.hasPermission(
  'user_dev_junior',
  Permission.USER_CREATE
);

console.log('Pode criar usuário?', hasPermission);
// false
```

---

### **Teste 9: Real-time Listeners**

1. Abra 2 abas do navegador
2. Login como `dev.junior` em ambas
3. Na Aba 1, mova uma tarefa
4. ✅ **Esperado:** Aba 2 atualiza AUTOMATICAMENTE

```typescript
// Aba 1 e Aba 2
import { RealtimeService } from './services/RealtimeService.ts';

RealtimeService.subscribeToPersonalTasks('user_dev_junior', (tasks) => {
  console.log('Tarefas atualizadas:', tasks.length);
  tasks.forEach(t => console.log(`- ${t.title} (${t.status})`));
});

// Agora na Aba 1, mude uma tarefa
// Aba 2 vai logar automaticamente a mudança!
```

---

### **Teste 10: Auditoria**

1. Executar qualquer operação sensível
2. Verificar que foi registrada em `audit_logs`

```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase.ts';

// Buscar logs de escalação
const q = query(
  collection(db, 'audit_logs'),
  where('companyId', '==', 'TESTCORP'),
  where('action', '==', 'task_escalated')
);

const logs = await getDocs(q);
logs.forEach(log => {
  console.log('Log:', log.data());
});
```

---

## 🎨 TESTANDO NO FRONTEND

Quando você criar componentes React, use os serviços assim:

```tsx
import React, { useEffect, useState } from 'react';
import { RealtimeService } from './services/RealtimeService';
import { KanbanService } from './services/KanbanService';
import { Task } from './types-v2';

function MyTasksBoard({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Escuta tarefas em tempo real
    const listenerId = RealtimeService.subscribeToPersonalTasks(
      userId,
      (updatedTasks) => setTasks(updatedTasks)
    );

    return () => {
      RealtimeService.unsubscribe(listenerId);
    };
  }, [userId]);

  const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const result = await KanbanService.moveTask(
      userId,
      taskId,
      newStatus,
      task.version
    );

    if (!result.success) {
      alert(result.error); // Mostra erro amigável
    }
    // Não precisa atualizar estado - listener faz automaticamente!
  };

  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onMove={handleMoveTask} />
      ))}
    </div>
  );
}
```

---

## 📊 VALIDAÇÃO DE FIRESTORE RULES

Para testar as regras de segurança:

```bash
# Instale o emulador do Firebase
npm install -g firebase-tools

# Inicie o emulador
firebase emulators:start --only firestore

# Execute testes de regras
firebase emulators:exec --only firestore "npm test"
```

---

## 🔍 DEBUG TOOLS

### Ver Hierarquia de um Usuário
```typescript
import { HierarchyService } from './services/HierarchyService.ts';

const { path, level } = await HierarchyService.calculateHierarchyPath('user_dev_junior');
console.log('Path:', path);
console.log('Nível:', level);
```

### Validar Integridade da Hierarquia
```typescript
const result = await HierarchyService.validateCompanyHierarchy('TESTCORP');
console.log('Hierarquia válida?', result.valid);
if (!result.valid) {
  console.log('Problemas:', result.issues);
}
```

### Ver Permissões de um Usuário
```typescript
const context = await AuthorizationService.createAuthContext('user_dev_junior');
console.log('Permissões:', context?.permissions);
```

### Limpar Locks Expirados
```typescript
const cleaned = await KanbanService.cleanupExpiredLocks();
console.log('Locks limpos:', cleaned);
```

---

## 🐛 TROUBLESHOOTING

### "Sem dados no Firestore"
Execute: `seedDatabase()` no console

### "Erro de permissão"
Verifique que Firestore Rules V2 estão ativas:
```bash
firebase deploy --only firestore:rules
```

### "Tarefa não atualiza em tempo real"
Verifique se os listeners estão ativos:
```typescript
console.log('Listeners ativos:', RealtimeService['listeners'].size);
```

### "Lock não libera"
Limpe manualmente:
```typescript
await KanbanService.cleanupExpiredLocks();
```

---

## ✅ CHECKLIST DE TESTES

- [ ] Fluxo descendente funciona
- [ ] Fluxo ascendente funciona
- [ ] Fluxo entre departamentos permitido funciona
- [ ] Fluxo entre departamentos bloqueado escala corretamente
- [ ] Concorrência no Kanban gera erro apropriado
- [ ] Desativação realoca subordinados
- [ ] Lock distribuído previne race conditions
- [ ] Permissões são respeitadas
- [ ] Real-time listeners funcionam
- [ ] Auditoria registra eventos
- [ ] Hierarquia pode ser validada
- [ ] Firestore Rules bloqueiam acessos indevidos

---

## 📚 DOCUMENTAÇÃO COMPLETA

- `ARCHITECTURE_SUMMARY_V2.md` - Visão geral arquitetural
- `MIGRATION_GUIDE_V2.md` - Guia de migração V1→V2
- `types-v2.ts` - Todas as interfaces
- `services/` - Documentação inline em cada serviço

---

**Pronto para testar!** 🚀

Qualquer dúvida, consulte os arquivos de documentação ou os comentários inline nos serviços.
