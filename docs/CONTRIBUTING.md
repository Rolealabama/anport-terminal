# 🚀 Guia de Contribuição - AnPort

## Bem-vindo! 👋

Este guia ajudará você a contribuir com o projeto AnPort de forma consistente e profissional.

## 📋 Pré-requisitos

- Node.js 18+
- npm 10+
- Git
- VSCode (recomendado)

## 🔧 Setup do Projeto

```bash
# Clone o repositório
git clone https://github.com/seu-repo/anport.git
cd anport

# Instale dependências
npm install

# Inicie testes
npm test

# Inicie desenvolvimento
npm run dev
```

## 📂 Estrutura de Pastas

```
src/
├── components/          # Componentes React por tipo
├── services/           # Serviços (Firebase, APIs)
├── utils/             # Funções utilitárias
├── types/             # Tipos TypeScript
├── config/            # Configurações
├── App.tsx            # Componente raiz
└── index.tsx          # Ponto de entrada
```

## 🎨 Convenções de Código

### Componentes React

```typescript
// ✅ BOM: Componente funcional com tipos
interface TaskCardProps {
  taskId: string
  title: string
  onComplete?: () => void
}

export const TaskCard: React.FC<TaskCardProps> = ({
  taskId,
  title,
  onComplete
}) => {
  return (
    <div className="task-card">
      <h3>{title}</h3>
      {/* conteúdo */}
    </div>
  )
}

// ❌ RUIM: Component sem tipos, exports anônimos
export default function TaskCard(props) {
  return <div>{props.title}</div>
}
```

### Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `TaskCard.tsx` |
| Props Interfaces | `{Component}Props` | `TaskCardProps` |
| Tipo Genérico | PascalCase | `Task`, `User` |
| Função | camelCase | `formatDate()` |
| Constante | SCREAMING_SNAKE_CASE | `MAX_ITEMS = 10` |
| Arquivo JS/TS | camelCase | `dateUtils.ts` |

### Imports

```typescript
// ✅ ORGANIZE: React, libs externas, imports internos, tipos
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { TaskService } from '@/services/taskService'
import { TaskCard } from '@/components/boards/TaskCard'
import { formatDate } from '@/utils/dateUtils'
import type { Task } from '@/types'
```

## 🧪 Testes

### Antes de Commitar

```bash
# Rode testes
npm test

# Verifique coverage
npm run test:coverage

# Deve ter cobertura > 80%
```

### Escrevendo Testes

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskCard } from './TaskCard'

describe('TaskCard', () => {
  const mockTask = {
    id: '1',
    title: 'Tarefa teste',
    status: 'TODO'
  }

  it('should render task title', () => {
    render(<TaskCard {...mockTask} />)
    expect(screen.getByText('Tarefa teste')).toBeInTheDocument()
  })

  it('should call onComplete when button clicked', async () => {
    const onComplete = vi.fn()
    render(<TaskCard {...mockTask} onComplete={onComplete} />)

    fireEvent.click(screen.getByRole('button', { name: /complete/i }))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
```

**Regras:**
- Cobertura mínima: 80%
- Teste comportamento, não implementação
- Use `findBy` para async, `getBy` para síncrono
- Mock Firestore com `vi.mock()`

## 🔄 Git Workflow

### 1. Crie uma branch

```bash
git checkout -b feature/descricao-branch
# ou para bug fix
git checkout -b fix/descricao-fix
```

### Nomes de Branch
- Feature: `feature/task-card-redesign`
- Bug Fix: `fix/login-modal-close`
- Hotfix: `hotfix/critical-memory-leak`
- Docs: `docs/update-readme`

### 2. Faça commits significativos

```bash
# ✅ BOM: Mensagem clara e em inglês
git commit -m "feat: add task sorting by priority"

# ✅ TAMBÉM BOM: Em português
git commit -m "feat: adicionar ordenação de tarefas"

# ❌ RUIM: Vago
git commit -m "fix stuff"
```

**Tipos de Commit:**
- `feat:` Nova feature
- `fix:` Correção de bug
- `docs:` Documentação
- `test:` Testes
- `refactor:` Refatoração
- `style:` Formatação
- `perf:` Performance

### 3. Push e crie Pull Request

```bash
git push origin feature/descricao-branch
# Crie PR no GitHub
```

**Descrição do PR deve incluir:**
- O que foi mudado
- Por que foi mudado
- Como testar
- Screenshots (se UI)

## ✅ Checklist Antes de Submeter

- [ ] Código segue convenções do projeto
- [ ] Testes novos/atualizados e passando
- [ ] Coverage mantém > 90%
- [ ] TypeScript sem erros (`npm run type-check`)
- [ ] Sem `console.log` em produção
- [ ] Commits com mensagens claras
- [ ] PR tem descrição clara
- [ ] Documentação atualizada

## 🐛 Reportando Bugs

Use a template:

```markdown
## Descrição
[Descreva o bug claramente]

## Passos para Reproduzir
1. ...
2. ...
3. ...

## Comportamento Esperado
[O que deveria acontecer]

## Comportamento Atual
[O que está acontecendo]

## Screenshots/Logs
[Se aplicável]

## Ambiente
- OS: macOS/Windows/Linux
- Node: v18.x.x
- npm: v10.x.x
```

## 💡 Sugestões de Features

Template:

```markdown
## Descrição da Feature
[Descreva a feature desejada]

## Motivação
[Por que precisa desta feature?]

## Solução Proposta
[Como você gostaria que fosse?]

## Alternativas
[Outras abordagens possíveis?]
```

## 📚 Recursos Úteis

- **TypeScript**: https://www.typescriptlang.org/docs/
- **React**: https://react.dev/
- **Testing Library**: https://testing-library.com/
- **Firebase**: https://firebase.google.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

## 📞 Precisa de Ajuda?

1. Verifique issues existentes
2. Leia a documentação em `/docs`
3. Abra uma issue com tag `question`
4. Mencione @maintainers

## 🙌 Agradecimentos

Obrigado por contribuir com o projeto! Suas contribuições ajudam a melhorar a plataforma para todos! 🚀

---
**Página de Contribuição Atualizada**: 2024 | **Versão**: 1.0.0
