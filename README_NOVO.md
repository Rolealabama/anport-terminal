# E-Comm Terminal Pro 🚀

> Uma plataforma terminal de e-commerce completa com controle de tarefas, gerenciamento de equipe, relatórios e integração Firestore.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Coverage](https://img.shields.io/badge/coverage-93.67%25-brightgreen)
![Tests](https://img.shields.io/badge/tests-54%2F54-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 Índice

- [Características](#características)
- [Tech Stack](#tech-stack)
- [Setup Rápido](#setup-rápido)
- [Uso](#uso)
- [Testes](#testes)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Documentação](#documentação)
- [Contribuição](#contribuição)

## ✨ Características

### 🔐 Multi-Usuário
- **SuperAdmin**: Acesso completo ao sistema
- **Empresa**: Gerencia suas lojas
- **Gerente de Loja**: Controla a equipe
- **Colaborador**: Executa tarefas

### 📊 Gerenciamento de Tarefas
- Kanban board com 3 colunas (TODO/DOING/DONE)
- Checklist de subtarefas
- Proof of completion com upload de arquivo
- Status em tempo real

### 👥 Gerenciamento de Equipe
- Adicionar/remover membros
- Agendas e horários
- Demandas fixas (routines)
- Rastreamento de performance

### 📈 Analytics & Relatórios
- Dashboard de estatísticas
- Relatório de tarefas por usuário
- Auditoria com visualização de prova
- Histórico de ações

### 💬 Comunicação
- Solicitações e comunicados
- Sistema de notificações
- Time-ago formatting
- Auto-dismiss de notificações

### ⚙️ Administração
- CMS para empresas e lojas
- Status de suspensão
- Validação de identidades
- Cache inteligente

## 🛠️ Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **Backend** | Firebase Firestore |
| **Testes** | Vitest, Testing Library, Playwright |
| **Build** | Vite |
| **DevOps** | GitHub Actions, PWA |

## 🚀 Setup Rápido

### 1. Pré-requisitos
```bash
- Node.js 18+
- npm 10+
- Conta Firebase
```

### 2. Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-repo/e-comm-terminal-pro.git
cd e-comm-terminal-pro

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves Firebase
```

### 3. Variáveis de Ambiente

```env
# .env.local
VITE_FIREBASE_API_KEY=sua_chave
VITE_FIREBASE_AUTH_DOMAIN=seu_dominio
VITE_FIREBASE_PROJECT_ID=seu_projeto
VITE_FIREBASE_STORAGE_BUCKET=seu_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 4. Rode o Projeto

```bash
# Desenvolvimento
npm run dev
# Acesso: http://localhost:5173

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 📖 Uso

### Login
1. Acesse http://localhost:5173
2. Selecione o tipo de usuário:
   - **Dev (SuperAdmin)**: Acesso completo
   - **Empresa**: Gerencia empresa e lojas
   - **Gerente Loja**: Gerencia equipe
   - **Colaborador**: Executa tarefas

3. Preencha as credenciais
4. Clique em "Entrar"

### Criando Tarefas
1. Clique em "Nova Tarefa"
2. Preencha título, descrição e deadline
3. Adicione checklist de subtarefas
4. Atribua à equipe
5. Clique em "Criar"

### Completando Tarefas
1. Clique em "Completar" na tarefa
2. Anexe prova do trabalho
3. Confirme a conclusão
4. Tarefa move para DONE

### Gerenciando Equipe
1. Acesse "Configurações"
2. Adicione membros
3. Configure agendas
4. Defina demandas fixas

## 🧪 Testes

### Rodar Testes

```bash
# Todos os testes
npm test

# Modo watch
npm test -- --watch

# Com coverage
npm run test:coverage

# Teste específico
npm test -- TaskCard.test.tsx

# UI Vitest
npm test -- --ui
```

### Métricas

```
Coverage: 93.67%
├── Statements: 93.67%
├── Branches: 83.01%
├── Functions: 71.64%
└── Lines: 93.67%

Component Coverage: 92.84%
Test Files: 19 ✅
Tests: 54 ✅ (100% passing)
```

### Write Testes

```typescript
describe('TaskCard', () => {
  it('should render task', () => {
    render(<TaskCard title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should handle completion', async () => {
    const onComplete = vi.fn()
    render(<TaskCard onComplete={onComplete} />)
    
    fireEvent.click(screen.getByRole('button', { name: /complete/i }))
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
```

**Regras de Teste:**
- Cobertura mínima: 80%
- Use padrão AAA (Arrange, Act, Assert)
- Teste comportamento, não implementação
- Mock Firebase com `vi.mock()`

## 📁 Estrutura do Projeto

```
e-comm-terminal-pro/
├── src/
│   ├── components/          # Componentes React
│   │   ├── modals/         # Diálogos modais
│   │   ├── sections/       # Seções de conteúdo
│   │   ├── boards/         # Visualizações
│   │   ├── auth/           # Autenticação
│   │   ├── admin/          # Admin features
│   │   └── ...
│   ├── services/            # Firebase, APIs
│   ├── utils/              # Funções auxiliares
│   ├── types/              # Tipos TypeScript
│   ├── config/             # Configurações
│   ├── App.tsx             # Componente raiz
│   └── index.tsx           # Entry point
├── tests/
│   ├── unit/               # Testes unitários
│   │   ├── core/          # App, Firebase
│   │   ├── components/    # Testes de componentes
│   │   ├── utils/         # Testes de utilidades
│   │   └── mocks/         # Mocks compartilhados
│   └── e2e/               # Teste Playwright
├── docs/                   # Documentação
│   ├── PROJECT_STRUCTURE.md
│   ├── TESTING_GUIDE.md
│   └── CONTRIBUTING.md
├── .github/workflows/      # GitHub Actions
└── vite.config.ts          # Configuração Vite
```

## 📚 Documentação

### Guias Principais

| Documento | Descrição |
|-----------|-----------|
| [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Organização do projeto e pastas |
| [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) | Guia completo de testes |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Como contribuir |
| [MANUAL_TESTES.md](MANUAL_TESTES.md) | Testes manuais |

### Seções
- 📂 Estrutura de pastas e convenções
- 🧪 Padrões de teste e cobertura
- 🔧 Como configurar o projeto
- 🚀 Deploy e CI/CD
- 🐛 Debugging e troubleshooting

## 🤝 Contribuição

Adoramos contribuições! Veja [CONTRIBUTING.md](docs/CONTRIBUTING.md) para:

1. Fork the repository
2. Crie um branch (`git checkout -b feature/AmazingFeature`)
3. Commit mudanças (`git commit -m 'feat: add AmazingFeature'`)
4. Push para o branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

**Checklist:**
- ✅ Código segue convenções
- ✅ Testes passando (100%)
- ✅ Coverage > 90%
- ✅ Documentação atualizada
- ✅ Sem `console.log` em produção

## 📊 Scripts

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de dev
npm run build            # Build para produção
npm run preview          # Preview do build

# Testes
npm test                 # Testes modo watch
npm run test:coverage    # Com coverage report
npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright UI

# Qualidade
npm run lint             # ESLint (se configurado)
npm run type-check       # TypeScript check
```

## 🔒 Segurança

- ✅ Firebase Auth
- ✅ Validação de dados
- ✅ Roles-based access control
- ✅ Audit logging
- ✅ Proteção contra XSS/CSRF

## 📈 Performance

- ⚡ Lazy loading componentes
- 📦 Code splitting com Vite
- 🚀 PWA com service workers
- 💾 Cache inteligente
- 🎯 Otimizado para mobile

## 🐛 Troubleshooting

### Problema: Testes falham com "Firebase not initialized"
```bash
# Solução: Verifique mocks em tests/setup.ts
npm test -- --no-cache
```

### Problema: Port 5173 já em uso
```bash
# Solução: Use porta diferente
npm run dev -- --port 3000
```

### Problema: Build falha
```bash
# Solução: Limpe cache
rm -rf dist node_modules
npm install
npm run build
```

## 📞 Suporte

- 📖 Leia a [documentação](docs/)
- 🐛 Abra uma [issue](https://github.com/seu-repo/issues)
- 💬 Discussões no GitHub
- 📧 Email: support@seu-dominio.com

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

## 🙏 Agradecimentos

- React team por React/19
- Firebase por backend
- Vitest por testes rápidos
- Tailwind CSS por styling

## 📊 Status do Projeto

| Métrica | Status |
|---------|--------|
| **Cobertura de Testes** | 93.67% ✅ |
| **Testes Passando** | 54/54 ✅ |
| **TypeScript Errors** | 0 ✅ |
| **Build** | Pass ✅ |
| **Deployment** | Pronto 🚀 |

---

**Desenvolvido com ❤️ por [Seu Nome/Time]**  
**Versão**: 1.0.0 | **Última Atualização**: 2024 | **Status**: Production Ready ✅
