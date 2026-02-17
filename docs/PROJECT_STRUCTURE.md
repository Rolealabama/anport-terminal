# 📁 Estrutura do Projeto AnPort

## Visão Geral
```
anport/
├── src/                          # Código-fonte principal
│   ├── components/               # Componentes React organizados por tipo
│   ├── services/                 # Serviços e APIs
│   ├── utils/                    # Utilitários e helpers
│   ├── types/                    # Tipos TypeScript compartilhados
│   ├── config/                   # Configurações da aplicação
│   ├── App.tsx                   # Componente raiz
│   ├── index.tsx                 # Ponto de entrada
│   └── index.html                # Template HTML
├── tests/                        # Testes automatizados
│   ├── unit/                     # Testes unitários
│   ├── e2e/                      # Testes end-to-end (Playwright)
│   └── setup.ts                  # Setup global de testes
├── docs/                         # Documentação do projeto
├── .github/                      # GitHub Actions e workflows
├── coverage/                     # Relatórios de cobertura
├── dist/                         # Build output
└── node_modules/                 # Dependências npm
```

## Estrutura de `/src/components`

### 📋 `components/modals/`
Componentes modais e diálogos:
- `CompleteTaskModal.tsx` - Modal para completar tarefas com upload de prova
- `ConfirmationModal.tsx` - Modal de confirmação genérica
- `NewTaskModal.tsx` - Modal para criar novas tarefas
- `TeamSettingsModal.tsx` - Modal de configurações da equipe

### 📊 `components/sections/`
Seções de conteúdo principal:
- `FeedbackSection.tsx` - Seção de solicitações/comunicados e respostas
- `ReportsSection.tsx` - Seção de relatórios e auditoria

### 📈 `components/boards/`
Componentes de visualização de dados:
- `KanbanBoard.tsx` - Board Kanban com colunas (TODO/DOING/DONE)
- `TeamBoard.tsx` - Visualização de equipe, agendas e demandas fixas
- `AdminStats.tsx` - Estatísticas de administrador

### 🔐 `components/auth/`
Componentes relacionados a autenticação:
- `Login.tsx` - Tela de login multi-usuário

### ⚙️ `components/admin/`
Componentes administrativos:
- `SuperAdminDashboard.tsx` - Dashboard para gerenciar empresas e lojas

### 🔔 `components/` (Root)
- `NotificationCenter.tsx` - Centro de notificações com timestamps

## Estrutura de `/src`

### `services/`
Serviços de negócio e integração:
- `firebase.ts` - Configuração Firebase e Firestore

### `utils/`
Funções utilitárias:
- `utils.ts` - Helpers: hash de senha, geração de salt, utilidades de data

### `types/`
Tipos TypeScript compartilhados:
- `types.ts` - Interfaces e tipos globais

### `config/`
Configurações da aplicação:
- `firebase.config.ts` - Chaves Firebase
- `constants.ts` - Constantes da aplicação

## Estrutura de `/tests`

### `tests/unit/core/`
Testes de arquivos principais:
- `App.test.tsx` - Testes da aplicação principal
- `index.test.tsx` - Testes do ponto de entrada
- `firebase.test.ts` - Testes de configuração Firebase
- `sw.test.ts` - Testes de service worker
- `playwright.config.test.ts` - Testes de configuração E2E

### `tests/unit/components/`
Testes de componentes:
- `modals/` - Testes de modais
  - `CompleteTaskModal.test.tsx`
  - `ConfirmationModal.test.tsx`
  - `NewTaskModal.test.tsx`
  - `TeamSettingsModal.test.tsx`
- `sections/` - Testes de seções
  - `FeedbackSection.test.tsx`
  - `ReportsSection.test.tsx`
- `boards/` - Testes de boards
  - `AdminStats.test.tsx`
  - `KanbanBoard.test.tsx`
  - `TeamBoard.test.tsx`
- `auth/` - Testes de autenticação
  - `Login.test.tsx`
- `admin/` - Testes administrativos
  - `SuperAdminDashboard.test.tsx`
- `NotificationCenter.test.tsx`

### `tests/unit/utils/`
Testes de utilitários:
- `utils.test.ts` - Testes de funções auxiliares

### `tests/unit/mocks/`
Mocks compartilhados:
- `firebase.mock.ts` - Mocks do Firebase
- `components.mock.ts` - Mocks de componentes
- `handlers.mock.ts` - Mocks de handlers

### `tests/e2e/`
Testes end-to-end com Playwright

## Convenções de Código

### Nomes de Arquivos
- **Componentes React**: `PascalCase.tsx` (ex: `TaskCard.tsx`)
- **Tipos/Interfaces**: `types.ts` ou `interfaces.ts`
- **Utilitários**: `camelCase.ts` (ex: `dateUtils.ts`)
- **Testes**: `[Arquivo].test.ts(x)` (ex: `App.test.tsx`)

### Estrutura de Pastas
```
component/
├── Component.tsx      # Componente principal
├── Component.test.tsx # Testes
├── types.ts          # Tipos específicos (opcional)
└── index.ts          # Export (opcional)
```

### Imports e Exports
```typescript
// ✅ Bom - Imports específicos
import { TaskCard } from '@/components/boards/TaskCard'
import { formatDate } from '@/utils/dateUtils'

// ❌ Evitar - Imports genéricos
import * as components from '@/components'
```

## Alias de Path

Configure no `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/services/*": ["src/services/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```

## Estrutura de Testes

### Por Categoria
- **Unit**: Testes isolados de componentes/funções
- **Integration**: Testes de múltiplos componentes juntos
- **E2E**: Testes de fluxos completos do usuário

### Nomeação de Testes
```typescript
describe('ComponentName', () => {
  it('should [expected behavior]', () => {
    // AAA pattern: Arrange, Act, Assert
  })
})
```

### Cobertura Esperada
- **Linhas**: 93.67%
- **Branches**: 83.01%
- **Funções**: 71.64%
- **Componentes**: 92.84%

## Checklist de Qualidade

- [ ] TypeScript sem erros
- [ ] Testes passando 100%
- [ ] Cobertura acima de 90%
- [ ] ESLint sem avisos
- [ ] Imports organizados
- [ ] Documentação atualizada
- [ ] Nenhum `console.log` em produção

## Próximos Passos

1. ✅ Estrutura de pastas implementada
2. ✅ Testes reorganizados
3. ⏳ CI/CD pipeline GitHub Actions
4. ⏳ Pre-commit hooks (Husky)
5. ⏳ Storybook para componentes

---
**Último Update**: $(date) | **Versão**: 1.0.0
