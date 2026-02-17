# 📋 Kanban Multi-Tenant V2 - Sistema Enterprise

## 🎯 Visão Geral

Sistema Kanban corporativo multi-tenant com hierarquia organizacional, permissões granulares e controle de concorrência enterprise-grade.

### **Principais Recursos:**

- ✅ **Hierarquia Organizacional** - Estrutura flexível com `superiorId`
- ✅ **42 Permissões Granulares** - Controle de acesso detalhado
- ✅ **Fluxo Hierárquico de Tarefas** - Ascendente, descendente e entre departamentos
- ✅ **Controle de Concorrência** - Lock distribuído + versionamento otimista
- ✅ **Real-time** - Via Firestore Listeners
- ✅ **Auditoria Completa** - LGPD compliant
- ✅ **Multi-tenant** - Isolamento total entre empresas

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [🏗️ ARCHITECTURE_SUMMARY_V2.md](ARCHITECTURE_SUMMARY_V2.md) | Arquitetura detalhada do sistema |
| [📊 EXECUTIVE_SUMMARY_V2.md](EXECUTIVE_SUMMARY_V2.md) | Resumo executivo para stakeholders |
| [✅ IMPLEMENTATION_CHECKLIST_V2.md](IMPLEMENTATION_CHECKLIST_V2.md) | Checklist de implementação |
| [🔄 MIGRATION_GUIDE_V2.md](MIGRATION_GUIDE_V2.md) | Guia de migração V1 → V2 |
| [🧪 TESTING_GUIDE_V2.md](TESTING_GUIDE_V2.md) | Guia de testes |
| [🔒 SECURITY.md](SECURITY.md) | **Guia de segurança** |
| [🚀 DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) | **Guia de deploy** |
| [🧹 CLEANUP_ANALYSIS.md](CLEANUP_ANALYSIS.md) | Análise de limpeza do projeto |

---

## 🚀 Quick Start

### **1. Pré-requisitos**

- Node.js 20+
- Firebase Account
- Git

### **2. Instalação**

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/projetoKamban.git
cd projetoKamban

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Firebase
```

### **3. Configuração Firebase**

1. Crie projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative Firestore Database
3. Copie as credenciais para `.env`
4. Deploy das regras de segurança:

```bash
firebase login
firebase deploy --only firestore:rules
```

### **4. Executar Localmente**

```bash
npm run dev
```

Acesse: http://localhost:3000

**Login SuperAdmin:**
- Usuário: `superadmin`
- Senha: (definida em `.env`)

---

## 🏗️ Estrutura do Projeto

```
projetoKamban/
├── components/          # Componentes React
├── services/           # Serviços V2 (Authorization, Hierarchy, Task, etc)
├── tests/
│   ├── unit/          # Testes unitários
│   └── e2e/           # Testes E2E (Playwright)
├── .github/
│   └── workflows/     # CI/CD (GitHub Actions)
├── types-v2.ts        # Tipos TypeScript V2
├── firebase.ts        # Configuração Firebase
├── firestore-v2.rules # Regras de segurança
├── seed-data.ts      # Dados de teste
└── migration-script.ts # Script de migração V1→V2
```

---

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run build            # Build para produção
npm run preview          # Preview do build

# Testes
npm run test             # Testes em modo watch
npm run test:ci          # Testes CI (run once)
npm run test:coverage    # Testes com cobertura
npm run test:e2e         # Testes E2E (Playwright)

# Qualidade
npm run lint             # Lint (TypeScript check)
npm run type-check       # Verificação de tipos
```

---

## 📊 Arquitetura V2

### **Hierarquia de Dados**

```
Company (Empresa)
  ├── Departments (Setores/Lojas)
  ├── Roles (Cargos com Permissões)
  └── Users (Usuários com hierarchy)
        ├── superiorId → Relação hierárquica
        ├── hierarchyPath → Caminho completo
        └── hierarchyLevel → Nível na hierarquia

Tasks
  ├── flowType → DESCENDANT | ASCENDANT | SAME_LEVEL | TO_DEPARTMENT
  ├── escalation Path → Caminho de escalação
  └── version → Controle de concorrência
```

### **Serviços Principais**

| Serviço | Responsabilidade |
|---------|------------------|
| `AuthorizationService` | Validação de permissões e autorização |
| `HierarchyService` | Gestão da hierarquia organizacional |
| `TaskService` | CRUD de tarefas com versionamento |
| `KanbanService` | Lógica do board Kanban |
| `RealtimeService` | Listeners e presença online |

---

## 🔐 Segurança

### **Variáveis de Ambiente**

⚠️ **NUNCA commite o arquivo `.env`**

```env
# Firebase
VITE_FIREBASE_API_KEY=***
VITE_FIREBASE_PROJECT_ID=***
# ... outras credenciais

# SuperAdmin (CRÍTICO)
VITE_SUPERADMIN_USERNAME=seu-usuario
VITE_SUPERADMIN_PASSWORD=senha-forte-aqui
```

### **GitHub Secrets**

Configure no repositório: **Settings** → **Secrets and variables** → **Actions**

Secrets necessários:
- Todas as variáveis `VITE_FIREBASE_*`
- `VITE_SUPERADMIN_USERNAME`
- `VITE_SUPERADMIN_PASSWORD`
- `FIREBASE_SERVICE_ACCOUNT` (para deploy)

📖 **Detalhes**: Veja [SECURITY.md](SECURITY.md)

---

## 🧪 Testes

### **Cobertura Atual**

- ✅ AuthorizationService - 85%+
- ✅ HierarchyService - 85%+
- ✅ TaskService - 85%+
- ⏳ Componentes React - Em desenvolvimento
- ⏳ Integração E2E - Em desenvolvimento

### **Rodar Testes**

```bash
# Todos os testes
npm run test

# Com cobertura
npm run test:coverage

# E2E (necessita Playwright instalado)
npm run test:e2e
```

---

## 🚀 Deploy

### **Opção 1: Deploy Manual**

```bash
npm run build
firebase deploy
```

### **Opção 2: Deploy Automático (CI/CD)**

Push para `main` dispara deploy automático via GitHub Actions.

📖 **Detalhes**: Veja [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

---

## 📦 Arquivos Importantes

### **V2 (Atual)**
- `types-v2.ts` - Tipos TypeScript
- `firestore-v2.rules` - Regras de segurança
- `services/*` - Serviços da aplicação
- `seed-data.ts` - Dados de teste

### **V1 (Legado - Manter por compatibilidade)**
- `types.ts` - Mantido para componentes antigos
- Componentes em `/components` - Ainda em V1

---

## 🔄 Migração V1 → V2

Se você tem dados V1 no Firestore:

```bash
# 1. Backup dos dados V1
# 2. Execute o script de migração
node migration-script.js

# 3. Valide os dados migrados
# 4. Atualize regras de segurança
firebase deploy --only firestore:rules
```

📖 **Detalhes**: Veja [MIGRATION_GUIDE_V2.md](MIGRATION_GUIDE_V2.md)

---

## 🛡️ Firestore Security Rules

As regras V2 (`firestore-v2.rules`) incluem:

- ✅ Isolamento por empresa (multi-tenant)
- ✅ Validação de hierarquia
- ✅ Controle de permissões
- ✅ Auditoria de acessos

```javascript
// Exemplo
match /tasks/{taskId} {
  allow read: if 
    hasPermission('TASK_VIEW_OWN') ||
    hasPermission('TASK_VIEW_DOWN');
    
  allow update: if
    validateTaskVersion() &&
    authorizeTaskUpdate();
}
```

---

## 📝 Padrões de Código

### **TypeScript**

```typescript
// ✅ Use tipos do types-v2.ts
import { User, Task, Permission } from './types-v2';

// ✅ Sempre tipifice
const user: User = await getUser(userId);

// ✅ Use enums
if (user.status === UserStatus.ACTIVE) { ... }
```

### **Services**

```typescript
// ✅ Sempre valide permissões
const authResult = await AuthorizationService.hasPermission(
  userId,
  Permission.TASK_CREATE_DOWN
);

// ✅ Use versionamento otimista
const result = await TaskService.updateTaskWithVersion(
  taskId,
  updates,
  currentVersion
);
```

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### **Commits Convencionais**

```bash
feat: nova funcionalidade
fix: correção de bug
docs: documentação
test: testes
chore: tarefas de manutenção
refactor: refatoração
```

---

## 📄 Licença

Proprietário - © 2026

---

## 👥 Equipe

- **Desenvolvedor Principal**: Maurício Silva ([mauriciosilvaking@hotmail.com](mailto:mauriciosilvaking@hotmail.com))
- **Arquitetura V2**: GitHub Copilot + Equipe

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/projetoKamban/issues)
- **Documentação**: Ver arquivos `*_V2.md`
- **Segurança**: Veja [SECURITY.md](SECURITY.md)

---

**Versão**: 2.0.0  
**Última Atualização**: Fevereiro 2026  
**Status**: ✅ Produção
