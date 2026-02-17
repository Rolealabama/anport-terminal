# ✅ CHECKLIST DE IMPLEMENTAÇÃO - Integração V2

Este checklist orienta a integração da arquitetura V2 com seu frontend React existente.

---

## 📋 FASE 1: PREPARAÇÃO (1-2 dias)

### **Ambiente**
- [ ] Validar que Firebase está configurado (.env com credenciais)
- [ ] Instalar dependências (se faltando): `npm install`
- [ ] Testar seed data: `seedDatabase()` no console
- [ ] Validar que Firestore está acessível

### **Documentação**
- [ ] Ler `ARCHITECTURE_SUMMARY_V2.md` (visão geral)
- [ ] Ler `TESTING_GUIDE_V2.md` (exemplos práticos)
- [ ] Explorar `types-v2.ts` (entender estruturas)
- [ ] Revisar cada serviço em `services/`

### **Firestore**
- [ ] Deploy das novas rules: `firebase deploy --only firestore:rules`
- [ ] Usar `firestore-v2.rules` ao invés de `firestore.rules`
- [ ] Testar regras com Firebase Emulator (opcional)

---

## 📋 FASE 2: COMPONENTES BASE (3-5 dias)

### **Login V2**
- [ ] Criar `components/LoginV2.tsx`
- [ ] Usar `AuthorizationService.createAuthContext()`
- [ ] Salvar contexto em Context API ou Zustand
- [ ] Implementar logout (limpar contexto)

**Exemplo:**
```tsx
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  authContext: AuthContext | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);

  const login = async (username: string, password: string) => {
    // 1. Buscar usuário no Firestore (validar senha)
    // 2. Criar AuthContext
    const context = await AuthorizationService.createAuthContext(userId);
    setAuthContext(context);
    setUser(foundUser);
  };

  const logout = () => {
    setUser(null);
    setAuthContext(null);
  };

  return (
    <AuthContext.Provider value={{ user, authContext, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### **Layout/Dashboard V2**
- [ ] Criar `components/DashboardV2.tsx`
- [ ] Mostrar nome, cargo, departamento do usuário
- [ ] Indicador de hierarquia (nível, superior)
- [ ] Menu baseado em permissões

**Exemplo:**
```tsx
function DashboardV2() {
  const { user, authContext } = useAuth();
  
  const canCreateUsers = authContext?.permissions.includes(Permission.USER_CREATE);
  const canViewReports = authContext?.permissions.includes(Permission.COMPANY_VIEW_ANALYTICS);

  return (
    <div>
      <header>
        <h1>{user?.name}</h1>
        <p>{user?.roleId} - {user?.departmentId}</p>
        <p>Nível {user?.hierarchyLevel}</p>
      </header>

      <nav>
        <Link to="/tasks">Minhas Tarefas</Link>
        {canCreateUsers && <Link to="/users/new">Criar Usuário</Link>}
        {canViewReports && <Link to="/reports">Relatórios</Link>}
      </nav>
    </div>
  );
}
```

---

### **Kanban Board V2**
- [ ] Criar `components/KanbanBoardV2.tsx`
- [ ] Usar `RealtimeService.subscribeToPersonalTasks()`
- [ ] Usar `KanbanService.moveTask()` com controle de versão
- [ ] Mostrar erro amigável em conflito de versão

**Exemplo:**
```tsx
function KanbanBoardV2({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Escuta tarefas em tempo real
    const listenerId = RealtimeService.subscribeToPersonalTasks(
      userId,
      (updatedTasks) => setTasks(updatedTasks)
    );

    return () => RealtimeService.unsubscribe(listenerId);
  }, [userId]);

  const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setError(null);
    const result = await KanbanService.moveTask(
      userId,
      taskId,
      newStatus,
      task.version
    );

    if (!result.success) {
      setError(result.error || 'Erro ao mover tarefa');
      // Opcional: recarregar tarefa atualizada
    }
  };

  return (
    <div>
      {error && <Alert type="error">{error}</Alert>}
      
      <div className="kanban-columns">
        {[TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE].map(status => (
          <Column key={status}>
            <h3>{status}</h3>
            {tasks.filter(t => t.status === status).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onMove={(newStatus) => handleMoveTask(task.id, newStatus)}
              />
            ))}
          </Column>
        ))}
      </div>
    </div>
  );
}
```

---

### **Task Card V2**
- [ ] Criar `components/TaskCardV2.tsx`
- [ ] Mostrar título, prioridade, checklist
- [ ] Indicador de versão (para debug)
- [ ] Badge de escalação (se houver)

**Exemplo:**
```tsx
function TaskCardV2({ task, onMove }: { task: Task; onMove: (status: TaskStatus) => void }) {
  return (
    <div className="task-card">
      <h4>{task.title}</h4>
      <p>{task.description}</p>
      
      <div className="badges">
        <Badge color={getPriorityColor(task.priority)}>{task.priority}</Badge>
        {task.escalationPath.length > 0 && (
          <Badge color="orange" title={`Escalado: ${task.escalationPath.join(' → ')}`}>
            Escalado
          </Badge>
        )}
      </div>

      {task.checklist && (
        <Checklist items={task.checklist} />
      )}

      <div className="actions">
        <button onClick={() => onMove(TaskStatus.IN_PROGRESS)}>
          Mover para Em Progresso
        </button>
      </div>

      {/* Debug */}
      <small className="text-gray-500">v{task.version}</small>
    </div>
  );
}
```

---

## 📋 FASE 3: FUNCIONALIDADES AVANÇADAS (5-7 dias)

### **Criação de Tarefas com Fluxo Hierárquico**
- [ ] Criar `components/CreateTaskModalV2.tsx`
- [ ] Dropdown de tipo de fluxo (Descendente/Ascendente/Setor)
- [ ] Autocomplete de destinatário (usuários/departamentos)
- [ ] Validação em tempo real (mostra se vai escalar)

**Exemplo:**
```tsx
function CreateTaskModalV2() {
  const { user } = useAuth();
  const [flowType, setFlowType] = useState<TaskFlowType>(TaskFlowType.DESCENDANT);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [willEscalate, setWillEscalate] = useState(false);

  // Valida se vai escalar SEM criar a tarefa
  useEffect(() => {
    const validate = async () => {
      if (!targetUserId) return;
      
      const result = await AuthorizationService.authorizeTaskCreation(
        user!.id,
        flowType,
        targetUserId
      );

      setWillEscalate(!!result.requiresEscalation);
    };

    validate();
  }, [flowType, targetUserId]);

  const handleSubmit = async (data: CreateTaskRequest) => {
    const result = await TaskService.createTask(user!.id, data);
    
    if (result.success) {
      toast.success('Tarefa criada!');
      if (result.escalationPath) {
        toast.info(`Tarefa escalada: ${result.escalationPath.join(' → ')}`);
      }
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Modal>
      <form onSubmit={handleSubmit}>
        <Select label="Tipo de Fluxo" value={flowType} onChange={setFlowType}>
          <option value={TaskFlowType.DESCENDANT}>Para Subordinado</option>
          <option value={TaskFlowType.ASCENDANT}>Para Superior</option>
          <option value={TaskFlowType.TO_DEPARTMENT}>Para Departamento</option>
        </Select>

        {willEscalate && (
          <Alert type="warning">
            Você não tem permissão direta. Esta tarefa será escalada automaticamente.
          </Alert>
        )}

        {/* Resto do formulário */}
      </form>
    </Modal>
  );
}
```

---

### **Visualização de Hierarquia**
- [ ] Criar `components/OrganizationChartV2.tsx`
- [ ] Usar biblioteca de árvore (ex: react-organizational-chart)
- [ ] Mostrar usuário, cargo, subordinados
- [ ] Click expande/colapsa nós

**Exemplo:**
```tsx
import { Tree, TreeNode } from 'react-organizational-chart';

function OrganizationChartV2({ companyId }: { companyId: string }) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Buscar todos usuários da empresa
    const fetchUsers = async () => {
      const q = query(
        collection(db, 'users'),
        where('companyId', '==', companyId),
        where('status', '==', UserStatus.ACTIVE)
      );
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    };
    fetchUsers();
  }, [companyId]);

  const buildTree = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const children = users.filter(u => u.superiorId === userId);

    return (
      <TreeNode label={<UserCard user={user} />}>
        {children.map(child => buildTree(child.id))}
      </TreeNode>
    );
  };

  // Encontra usuário no topo (sem superior)
  const topUser = users.find(u => !u.superiorId);

  return (
    <Tree label={<div>Organização</div>}>
      {topUser && buildTree(topUser.id)}
    </Tree>
  );
}
```

---

### **Notificações em Tempo Real**
- [ ] Criar `components/NotificationCenter.tsx`
- [ ] Usar `RealtimeService.subscribeToNotifications()`
- [ ] Toasts para novas notificações
- [ ] Badge de contagem

**Exemplo:**
```tsx
function NotificationCenter({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    const listenerId = RealtimeService.subscribeToNotifications(
      userId,
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
        
        // Mostra toast
        toast.info(notification.title, { description: notification.message });
      }
    );

    return () => RealtimeService.unsubscribe(listenerId);
  }, [userId]);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button>
          🔔 {notifications.filter(n => !n.read).length}
        </Button>
      </DropdownTrigger>

      <DropdownContent>
        {notifications.map(notif => (
          <NotificationItem key={notif.id} notification={notif} />
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
```

---

### **Gestão de Usuários**
- [ ] Criar `components/UserManagementV2.tsx`
- [ ] Listagem com hierarquia
- [ ] Criar novo usuário (com superior)
- [ ] Desativar usuário (com realocação)
- [ ] Mover usuário na hierarquia

---

### **Gestão de Departamentos**
- [ ] Criar `components/DepartmentManagementV2.tsx`
- [ ] CRUD de departamentos
- [ ] Atribuir/mudar líder
- [ ] Configurar regras de comunicação

---

### **Gestão de Roles/Permissões**
- [ ] Criar `components/RoleManagementV2.tsx`
- [ ] Criar role customizada
- [ ] Editor de permissões (checkboxes agrupados)
- [ ] Atribuir role a usuários

---

## 📋 FASE 4: OTIMIZAÇÕES (2-3 dias)

### **Performance**
- [ ] Implementar paginação em listas grandes
- [ ] Cache de roles/permissions (Context API)
- [ ] Lazy loading de componentes pesados
- [ ] Debounce em buscas/autocompl etes

### **UX**
- [ ] Loading states em operações assíncronas
- [ ] Skeleton loaders
- [ ] Mensagens de erro amigáveis
- [ ] Feedback visual em ações (toasts)

### **Acessibilidade**
- [ ] ARIA labels em botões
- [ ] Navegação por teclado
- [ ] Contraste de cores (WCAG AA)

---

## 📋 FASE 5: TESTES (3-5 dias)

### **Testes Unitários (Vitest)**
- [ ] `AuthorizationService.test.ts`
- [ ] `HierarchyService.test.ts`
- [ ] `KanbanService.test.ts`
- [ ] `TaskService.test.ts`

### **Testes E2E (Playwright)**
- [ ] Fluxo de login
- [ ] Criação de tarefa com escalação
- [ ] Movimentação no Kanban
- [ ] Desativação de usuário

### **Testes Manuais**
- [ ] Cenários de `TESTING_GUIDE_V2.md`
- [ ] Edge cases críticos
- [ ] Responsividade mobile
- [ ] Compatibilidade de browsers

---

## 📋 FASE 6: DEPLOY (1-2 dias)

### **Preparação**
- [ ] Rodar `npm run build`
- [ ] Validar que não há erros de TypeScript
- [ ] Executar testes automatizados
- [ ] Code review

### **Staging**
- [ ] Deploy em ambiente de staging
- [ ] Testes de aceitação
- [ ] Validação de performance
- [ ] Ajustes finais

### **Produção**
- [ ] Deploy de `firestore-v2.rules`
- [ ] Deploy do frontend
- [ ] Monitoramento por 24h
- [ ] Plano de rollback pronto

---

## 📋 FASE 7: PÓS-DEPLOY (ongoing)

### **Monitoramento**
- [ ] Configurar Sentry/LogRocket para erros
- [ ] Monitorar queries lentas no Firestore
- [ ] Analisar métricas de uso
- [ ] Feedback dos usuários

### **Manutenção**
- [ ] Limpar locks expirados (cron job)
- [ ] Validar integridade de hierarquias (mensal)
- [ ] Backup automático do Firestore
- [ ] Auditoria de logs sensíveis

### **Evolução**
- [ ] Coletar feedback de usuários
- [ ] Identificar novos edge cases
- [ ] Implementar melhorias
- [ ] Documentar mudanças

---

## ✅ VALIDAÇÃO FINAL

Antes de considerar concluído:

- [ ] Todos os cenários de `TESTING_GUIDE_V2.md` funcionam
- [ ] Nenhum erro no console do browser
- [ ] Performance < 500ms em queries
- [ ] Real-time latência < 200ms
- [ ] Zero vazamento entre empresas
- [ ] Auditoria registra eventos críticos
- [ ] Documentação está atualizada
- [ ] Time está treinado

---

## 🎯 ESTIMATIVA TOTAL

| Fase | Dias | Acumulado |
|------|------|-----------|
| Preparação | 1-2 | 2 |
| Componentes Base | 3-5 | 7 |
| Funcionalidades Avançadas | 5-7 | 14 |
| Otimizações | 2-3 | 17 |
| Testes | 3-5 | 22 |
| Deploy | 1-2 | 24 |
| **Total** | **15-24 dias** | **3-5 semanas** |

---

## 💡 DICAS

**Para Agilizar:**
- Use biblioteca de componentes (Shadcn, MUI, etc)
- Copie padrões dos componentes V1 existentes
- Priorize funcionalidades core antes de polish

**Para Evitar Problemas:**
- Sempre valide permissões no backend (nunca confie no frontend)
- Use TypeScript strict mode
- Teste escalação e concorrência com usuários reais
- Monitore Firestore read/write counts (custo)

**Para Escalar:**
- Considere Redis para cache de permissions (após 1000 users)
- Implemente paginação em tudo
- Use índices compostos no Firestore
- Rate limiting em APIs sensíveis

---

**Boa implementação!** 🚀

Este checklist é seu guia passo a passo. Marque os itens conforme avança e use os guias de documentação como referência.
