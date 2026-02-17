# 🧪 Guia de Testes - AnPort

## 📊 Cobertura de Testes

**Status Atual:**
- ✅ **Cobertura Geral**: 93.67%
- ✅ **Cobertura de Componentes**: 92.84%
- ✅ **Testes Passando**: 54/54 (100%)
- ✅ **Arquivos de Teste**: 19

### Quebra por Categoria

| Categoria | Arquivos | Testes | Cobertura | Status |
|-----------|----------|--------|-----------|--------|
| **Componentes** | 13 | 40 | 92.84% | ✅ |
| **Core** | 5 | 11 | 95.86% | ✅ |
| **Utils** | 1 | 3 | 100% | ✅ |
| **Total** | 19 | 54 | 93.67% | ✅ |

## 📁 Organização de Testes

### Estrutura
```
tests/
├── unit/
│   ├── core/                    # Testes de arquivos principais
│   │   ├── App.test.tsx
│   │   ├── firebase.test.ts
│   │   ├── index.test.tsx
│   │   ├── sw.test.ts
│   │   └── playwright.config.test.ts
│   ├── components/              # Testes de componentes
│   │   ├── modals/
│   │   │   ├── CompleteTaskModal.test.tsx
│   │   │   ├── ConfirmationModal.test.tsx
│   │   │   ├── NewTaskModal.test.tsx
│   │   │   └── TeamSettingsModal.test.tsx
│   │   ├── sections/
│   │   │   ├── FeedbackSection.test.tsx
│   │   │   └── ReportsSection.test.tsx
│   │   ├── boards/
│   │   │   ├── AdminStats.test.tsx
│   │   │   ├── KanbanBoard.test.tsx
│   │   │   └── TeamBoard.test.tsx
│   │   ├── auth/
│   │   │   └── Login.test.tsx
│   │   ├── admin/
│   │   │   └── SuperAdminDashboard.test.tsx
│   │   └── NotificationCenter.test.tsx
│   ├── utils/
│   │   └── utils.test.ts
│   ├── mocks/                   # Mocks compartilhados
│   │   ├── firebase.mock.ts
│   │   ├── components.mock.ts
│   │   └── handlers.mock.ts
│   └── setup.ts                 # Setup global
└── e2e/                         # Testes Playwright
```

## 🔬 Padrões de Teste

### 1. Estrutura Básica

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup antes de cada teste
  })

  afterEach(() => {
    // Cleanup após cada teste
  })

  it('should [expected behavior]', async () => {
    // Arrange
    const { getByRole } = render(<Component />)

    // Act
    fireEvent.click(getByRole('button', { name: /submit/i }))

    // Assert
    expect(getByRole('dialog')).toBeInTheDocument()
  })
})
```

### 2. Padrão AAA
- **Arrange**: Setup do estado inicial
- **Act**: Executar a ação
- **Assert**: Verificar resultados

### 3. Async Testing

```typescript
// ❌ Evitar
fireEvent.click(button)
expect(element).toBeInTheDocument() // Pode falhar

// ✅ Correto
fireEvent.click(button)
await waitFor(() => {
  expect(element).toBeInTheDocument()
})

// ✅ Melhor
fireEvent.click(button)
const element = await screen.findByRole('heading')
expect(element).toBeInTheDocument()
```

### 4. Mocking Firebase

```typescript
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => ({
    docs: [{ id: '1', data: () => ({ name: 'Test' }) }]
  })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn()
}))
```

### 5. Mocking Componentes

```typescript
vi.mock('@/components/ChildComponent', () => ({
  default: vi.fn(() => <div>Mocked Child</div>)
}))
```

## 📋 Detalhes dos Testes

### App.test.tsx (8 testes, 96.24% cobertura)
**Testa**: Aplicação principal, roteamento, autenticação
- ✅ Renderiza tela de login quando não logado
- ✅ Mostra dashboard quando autenticado
- ✅ Logout limpa cache e volta à login
- ✅ Atualiza dispositivos em cache
- ✅ Trata erros de conexão Firebase
- ✅ Admin pode criar tarefas e feedback
- ✅ Checklists funcionam corretamente
- ✅ Modal de feedback abre/fecha

### Login.test.tsx (10 testes, 97.43% cobertura)
**Testa**: Multi-usuario login, validações
- ✅ Login superadmin com permissões
- ✅ Login empresa com modo company
- ✅ Login store admin com empresa
- ✅ Empresas suspensos bloqueadas
- ✅ Colaborador encontra por username
- ✅ Erro ao não encontrar empresa
- ✅ Campos obrigatórios validados
- ✅ Carregamento durante chamada API
- ✅ Cache atualiza corretamente
- ✅ Session storage salva corretamente

### SuperAdminDashboard.test.tsx (5 testes, 83.71% cobertura)
**Testa**: Gerenciamento de empresas e lojas
- ✅ Valida ID da empresa (3-10 chars)
- ✅ Salva empresa em modo company
- ✅ Toggle status de empresa
- ✅ Pesquisa e filtra empresas
- ✅ Edita empresa existente

### NotificationCenter.test.tsx (4 testes, 100% cobertura)
**Testa**: Notificações, timestamps, dismiss
- ✅ Estado vazio quando sem notificações
- ✅ Auto-read após timeout
- ✅ Fecha ao clicar fora
- ✅ Time-ago formatter (minutos/horas/dias)

### TeamSettingsModal.test.tsx (5 testes, 93.22% cobertura)
**Testa**: Gerenciamento de equipe
- ✅ Adiciona novo membro
- ✅ Remove membro com confirmação
- ✅ Edita nome de membro
- ✅ Adiciona demandas fixas
- ✅ Atualiza horários de agenda

### Outros Componentes
- **FeedbackSection** (2 testes): Solicitações do usuário e comunicados admin
- **ReportsSection** (2 testes): Filtro por usuário, visualização de prova
- **TaskCard** (2 testes): Checklists, movimentação, deleção
- **TeamBoard** (2 testes): Renderização de equipe, configuração vazia
- **NewTaskModal** (2 testes): Validação de deadline, submissão
- **CompleteTaskModal** (1 teste): Upload de prova
- **ConfirmationModal** (2 testes): Confirm/cancel
- **KanbanBoard** (1 teste): Renderização de colunas
- **AdminStats** (1 teste): Estatísticas

### Utilitários (utils.test.ts)
- ✅ Hash de senha com salt
- ✅ Geração de salt aleatório
- ✅ Formatação de datas

## 🛠️ Rodando Testes

### Todos os Testes
```bash
npm test
```

### Testes com Coverage
```bash
npm run test:coverage
```

### Teste Específico
```bash
npm test -- TaskCard.test.tsx
```

### Modo Watch
```bash
npm test -- --watch
```

### Teste com UI (Vitest)
```bash
npm test -- --ui
```

## 📊 Visualizar Coverage

```bash
npm run test:coverage
# Abre coverage/index.html no navegador
```

## ✅ Checklist para Novos Testes

- [ ] Teste segue padrão AAA
- [ ] Mocks estão no topo do arquivo
- [ ] Async/await usado corretamente
- [ ] Nenhum `.only()` ou `.skip()`
- [ ] Testes são independentes
- [ ] Descrição clara do que testa
- [ ] Cobertura acima de 80%
- [ ] Todos os branches cobertos

## 🐛 Debugging Testes

### Ver DOM renderizado
```typescript
import { screen, debug } from '@testing-library/react'
debug() // Printa toda DOM
screen.debug(element) // Printa elemento específico
```

### Console logs durante testes
```typescript
// Testes com logs habilitados
npm test -- --reporter=verbose
```

### Parar no erro
```typescript
it.only('debug this', () => {
  // Rode só este teste
})
```

## 📈 Métricas por Arquivo

| Arquivo | Linhas | Branches | Funções | Status |
|---------|--------|----------|---------|--------|
| types.ts | 100% | 100% | 100% | ✅ |
| utils.ts | 100% | 75% | 100% | ✅ |
| firebase.ts | 100% | 100% | 100% | ✅ |
| index.tsx | 100% | 100% | 100% | ✅ |
| sw.js | 100% | 100% | 100% | ✅ |
| App.tsx | 96.24% | 86.07% | 80% | ✅ |
| Login.tsx | 97.43% | 89.18% | 85% | ✅ |
| NotificationCenter | 100% | 100% | 100% | ✅ |

## 🎯 Roadmap de Testes

- ✅ **Fase 1**: Testes unitários de componentes (COMPLETO)
- ✅ **Fase 2**: Testes de integração (COMPLETO)
- ✅ **Fase 3**: 90%+ coverage (COMPLETO - 93.67%)
- ⏳ **Fase 4**: Testes E2E com Playwright
- ⏳ **Fase 5**: CI/CD pipeline
- ⏳ **Fase 6**: Pre-commit hooks (Husky)

## 📞 Suporte

**Problemas Comuns:**

1. **Teste falha intermitentemente**
   - Use `waitFor()` para operações assíncronas
   - Evite `setTimeout`, use `vi.useFakeTimers()`

2. **Mock não funciona**
   - Vi.mock() deve estar no topo do arquivo
   - Hoisting: mocks são processados primeiro

3. **Elemento não encontrado**
   - Use `findBy*` para async
   - Use `getAllByRole()[0]` para múltiplos
   - Verifique seletores português (ã, é, ç)

---
**Última Atualização**: 2024 | **Versão**: 1.0.0 | **Cobertura**: 93.67%
