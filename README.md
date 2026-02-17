# AnPort - Gestão Cloud

Aplicação web (React + Vite + Firebase) para gestão de operação de lojas com tarefas, equipe, suporte, auditoria visual e notificações push.

## Descrição do projeto

O sistema centraliza:
- gestão de empresas/unidades e usuários;
- operação diária via quadro de tarefas;
- auditoria de execução com evidências;
- suporte interno e comunicação entre equipes;
- sincronização em nuvem com Firebase.

## Requisitos

- Node.js 20+
- npm 10+
- Projeto Firebase configurado
- (Opcional) Firebase CLI para deploy de functions

## Instalação (passo a passo)

1. Clone o repositório.
2. Instale dependências:

```bash
npm ci
```

3. Crie o arquivo `.env` na raiz com as variáveis necessárias (ex.: chave VAPID para push):

```env
VITE_FIREBASE_VAPID_KEY=SUA_CHAVE_PUBLICA_VAPID
```

4. (Opcional) Para backend de push em Cloud Functions:

```bash
cd functions
npm ci
cd ..
```

## Como rodar o projeto

Ambiente de desenvolvimento:

```bash
npm run dev
```

Build de produção:

```bash
npm run build
```

Preview local do build:

```bash
npm run preview
```

## Como rodar os testes

Testes unitários (watch):

```bash
npm test
```

Testes unitários em modo CI:

```bash
npm run test:ci
```

Testes E2E (Playwright):

```bash
npm run test:e2e
```

## Como verificar cobertura

```bash
npm run test:coverage
```

- O projeto está configurado para falhar quando cobertura global ficar abaixo de 90% (linhas, funções, branches e statements).
- Relatórios são gerados em `coverage/`.

## Pipeline de qualidade (CI)

Workflow em `.github/workflows/tests.yml` valida:
- `npm run lint`
- `npm run type-check`
- `npm run test:ci`
- `npm run test:coverage` (com threshold >= 90%)
- `npm run build`

Se qualquer etapa falhar, o pipeline falha.

## Estrutura de pastas

```text
.
├── components/              # Componentes principais da UI
├── config/                  # Configurações do domínio
├── docs/                    # Documentação complementar
├── functions/               # Cloud Functions (envio de push e automações)
├── scripts/                 # Scripts auxiliares
├── services/                # Serviços de domínio
├── src/                     # Código modular organizado por domínio
├── tests/
│   ├── unit/                # Testes unitários/integrados de componentes e serviços
│   └── e2e/                 # Fluxos críticos com Playwright
├── App.tsx
├── index.tsx
└── vite.config.ts
```

## Tecnologias usadas

- React 19
- TypeScript
- Vite
- Vitest + Testing Library
- Playwright
- Firebase (Firestore, FCM, Functions)

## Padrão de commits

Adotado padrão Conventional Commits:
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `refactor:` refatoração sem mudança funcional
- `test:` criação/ajuste de testes
- `docs:` documentação
- `chore:` manutenção técnica

Exemplo:

```text
feat(tasks): adicionar validação de checklist ao concluir tarefa
```

## Segurança e versionamento

O `.gitignore` está configurado para não versionar:
- dependências locais (`node_modules/`)
- builds e artefatos (`dist/`, `coverage/`, `test-results/`)
- arquivos de ambiente e segredos (`.env*`, chaves e tokens)
- caches, logs e arquivos de sistema operacional.
