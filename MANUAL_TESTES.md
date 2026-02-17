# 🧪 GUIA DE TESTES MANUAIS - E-COMM TERMINAL PRO

## ✅ Pré-requisitos
- [ ] Firebase Project criado e configurado
- [ ] Firestore Database inicializado
- [ ] Collections criadas: `companies`, `stores`, `stores_config`, `tasks`, `feedbacks`
- [ ] Navegador moderno (Chrome, Firefox, Edge, Safari)
- [ ] Dados de teste (mesmo que criados manualmente no Redis ou Firestore Console)

---

## 🔑 CREDENCIAIS DE TESTE

### Master DEV (Sistema)
```
Usuário: superadmin
Senha: master123
Papel: DEV (acesso total)
```

### Empresa de Teste
Deve estar criada no Firestore em `/companies/TEST-CORP`:
```json
{
  "id": "TEST-CORP",
  "name": "Empresa Teste",
  "adminUsername": "empresa_admin",
  "adminPassword": "[HASH SHA-256]",
  "passwordSalt": "[UUID]",
  "createdAt": 1708012800000,
  "isSuspended": false
}
```

### Unidade de Teste
Deve estar criada em `/stores/LOJA01`:
```json
{
  "id": "LOJA01",
  "companyId": "TEST-CORP",
  "name": "Loja 01",
  "adminUsername": "gerente_loja",
  "adminPassword": "[HASH]",
  "passwordSalt": "[UUID]",
  "adminName": "João Gerente",
  "createdAt": 1708012800000,
  "isBlocked": false
}
```

---

## 🧪 TESTE 1: LOGIN & AUTENTICAÇÃO

### Teste 1.1: Master DEV Bypass
```
1. Abra a aplicação
2. Deixe "Unidade Operacional" em branco
3. Usuário: superadmin
4. Senha: master123
5. Clique em "ENTRAR"

✅ ESPERADO:
   - Redirecionado para painel MASTER
   - Mostra "PAINEL MASTER" no header
   - Pode ver/criar empresas
```

### Teste 1.2: Company Admin Login
```
1. Na tela de login
2. Unidade: [qualquer valor, será ignorado]
3. Usuário: empresa_admin
4. Senha: [senha da empresa]
5. Clique em "ENTRAR"

✅ ESPERADO:
   - Login bem-sucedido
   - Acesso ao painel de gerenciamento de unidades
   - User name: "Empresa Teste"
```

### Teste 1.3: Store Admin Login
```
1. Na tela de login
2. Unidade: LOJA01
3. Usuário: gerente_loja
4. Senha: [senha do gerente]
5. Clique em "ENTRAR"

✅ ESPERADO:
   - Login bem-sucedido
   - Acesso ao painel operacional
   - Header mostra "UNIDADE LOJA01"
   - Pode criar tarefas e gerenciar equipe
```

### Teste 1.4: Validações de Erro
```
Teste 1.4.1 - Unidade não encontrada
  - Unidade: LOJA_FAKE
  - Esperado: "Unidade não encontrada."

Teste 1.4.2 - Credenciais inválidas
  - Unidade: LOJA01
  - Usuário: gerente_loja
  - Senha: ERRADA123
  - Esperado: "Credenciais inválidas."

Teste 1.4.3 - Unidade bloqueada
  - Criar loja com isBlocked: true
  - Tentar login
  - Esperado: "Unidade bloqueada."
```

---

## 📋 TESTE 2: CRIAÇÃO DE TAREFAS

### Teste 2.1: Criar tarefa válida
```
1. Login como Store Admin (LOJA01)
2. Clique em "NOVA TAREFA"
3. Preencha:
   - Descrição: "Limpar entrada"
   - Responsável: [membro da equipe]
   - Prioridade: "Alta"
   - Data: 16/02/2026 (amanhã)
4. Adicione checklist:
   - [ ] Varrer piso
   - [ ] Limpar vidros
   - [ ] Organizar tapetes
5. Clique "DELEGAR MISSÃO"

✅ ESPERADO:
   - Tarefa aparece em "A Fazer"
   - Pode mover para "Em Andamento"
   - Data aparece como "16/02"
   - Checklist visível quando em andamento
```

### Teste 2.2: Validação de Data
```
1. Clique em "NOVA TAREFA"
2. Tente selecionar uma data no passado
   
✅ ESPERADO:
   - Calendário não permite clicar em datas passadas
   - Min = Hoje
```

### Teste 2.3: Validação de Campos Obrigatórios
```
1. Tente criar tarefa sem:
   - Descrição
   - Responsável

✅ ESPERADO:
   - Submit fica desabilitado até preencher tudo
```

---

## 🔄 TESTE 3: FLUXO DE TRABALHO (KANBAN)

### Teste 3.1: Mover tarefa A Fazer → Em Andamento
```
1. Clique em "Iniciar Atividade" em uma tarefa em "A Fazer"

✅ ESPERADO:
   - Tarefa move para coluna "Em Andamento"
   - Checklist fica visível e interativo
   - Botão muda para "Concluir Missão"
```

### Teste 3.2: Completar checklist
```
1. Em uma tarefa "Em Andamento" com checklist
2. Clique nos checkboxes para marcar itens
3. Marque TODOS os itens

✅ ESPERADO:
   - Itens marcados ficam verde com linha
   - "Concluir Missão" fica habilitado quando 100%
```

### Teste 3.3: Finalizar tarefa com prova
```
1. Com checklist 100% completo, clique "Concluir Missão"
2. Descreva o que foi feito: "Entrada limpa com sucesso"
3. Selecione fotos (máximo 3 para teste)
4. Clique "FINALIZAR MISSÃO"

✅ ESPERADO:
   - Modal fecha
   - Tarefa move para "Concluído" (verde)
   - Pode clicar "Ver Comprovante" para ver fotos
   - Shows: data/hora, descrição, anexos
```

### Teste 3.4: Deletar tarefa (Admin)
```
1. Passe mouse sobre uma tarefa
2. Clique ícone "×" que aparece
3. Confirme exclusão

✅ ESPERADO:
   - Tarefa desaparece imediatamente
   - Firebase collection atualizada
```

---

## 👥 TESTE 4: GERENCIAMENTO DE EQUIPE

### Teste 4.1: Adicionar membro
```
1. Admin → Aba "EQUIPE"
2. Clique "Configuração da Unidade"
3. Preencha:
   - Nome: "Maria Silva"
   - Usuário: maria_silva
   - Senha: senha123
   - Celular: (11) 99999-1234
4. Clique "SALVAR MEMBRO"

✅ ESPERADO:
   - Membro aparece na lista
   - Senha é hashed (não armazenada em plaintext)
   - Pode usar essas credenciais para login
```

### Teste 4.2: Validação de Duplicata
```
1. Tente adicionar outro membro com username "maria_silva"

✅ ESPERADO:
   - Alerta: "Usuário já existe! Escolha outro."
```

### Teste 4.3: Definir escala de turno
```
1. Em "Escala de Turno"
2. Para cada membro, defina horário:
   - Maria Silva: "08:00 - 18:00"
3. Salve

✅ ESPERADO:
   - Dados salvos em stores_config
   - Próximo login mostra horários configurados
```

### Teste 4.4: Automação de Rotinas
```
1. Em "Automação de Rotinas"
2. Crie rotina:
   - Responsável: Maria Silva
   - Rotina: "Limpeza da entrada"
   - Dias: Seg, Ter, Qua, Qui, Sex
3. Clique "VINCULAR ROTINA"

✅ ESPERADO:
   - Rotina aparece na lista
   - Sistema pode gerar tarefas automáticas nesses dias
```

---

## 💬 TESTE 5: FEEDBACK & COMUNICADOS

### Teste 5.1: Colaborador envia solicitação
```
1. Login como Colaborador
2. Aba "AVISOS" → "Nova Solicitação"
3. Preencha:
   - Tipo: "Solicitação"
   - Assunto: "Falta Produto de Limpeza"
   - Mensagem: "Precisamos de mais produto..."
4. Clique "ENVIAR MENSAGEM"

✅ ESPERADO:
   - Feedback aparece em "Comunicados & Ouvidoria"
   - Status: "pendente"
   - Apenas esse usuário e admin podem ver
```

### Teste 5.2: Admin responde feedback
```
1. Login como Admin
2. Aba "AVISOS"
3. Encontre feedback pendente
4. Clique "Responder"
5. Escreva resposta: "Produto será entregue amanhã"
6. Clique "RESPONDER"

✅ ESPERADO:
   - Status muda para "respondido"
   - Resposta aparece para o colaborador
   - Data/hora da resposta visível
```

### Teste 5.3: Admin envia comunicado para todos
```
1. Login como Admin
2. Aba "AVISOS" → "Novo Comunicado"
3. Preencha:
   - Destino: "Para Toda Equipe"
   - Título: "Reunião Amanhã"
   - Mensagem: "Reunião às 14h..."
4. Clique "PUBLICAR AVISO"

✅ ESPERADO:
   - Comunicado aparece para TODOS na equipe
   - Destacado diferentemente
```

---

## 📊 TESTE 6: RELATÓRIOS E AUDITORIA

### Teste 6.1: Produtividade (Admin)
```
1. Admin → Aba "RELATÓRIOS"
2. Tab "PRODUTIVIDADE"

✅ ESPERADO:
   - Cards com cada membro da equipe
   - Total de tarefas
   - % de eficácia (concluídas/total)
   - Barra de progresso visual
   - Distribuição de atividades
```

### Teste 6.2: Auditoria Visual
```
1. Mesmo painel → Tab "AUDITORIA VISUAL"
2. Ver grid de imagens

✅ ESPERADO:
   - Apenas tarefas COM fotos aparecem
   - Mostra: membro responsável, título da tarefa
   - Data/hora de conclusão
   - Hover mostra descrição completa
   - Clique abre imagem em fullscreen
```

### Teste 6.3: Relatório do Colaborador
```
1. Login como Colaborador
2. Aba "RELATÓRIOS"

✅ ESPERADO:
   - VÊ apenas seus dados
   - SEUASPECTO PESSOAL mostrado
   - Não pode ver outros membros
```

---

## 🔍 TESTE 7: VALIDAÇÕES DE DADOS

### Teste 7.1: Verificar dados no Firestore
```
1. Abra Firebase Console
2. Firestore Database
3. Navegue até /tasks/[taskId]

✅ ESPERADO:
   {
     "storeId": "LOJA01",
     "title": "...",
     "responsible": "...",
     "status": "Concluído",
     "createdAt": 1708012800000,
     "completedAt": 1708099200000,
     "completionDescription": "...",
     "completionAttachments": [...]
   }
```

### Teste 7.2: Verificar hash de senha
```
1. Abra Firebase Console
2. Navegue até /stores_config/LOJA01
3. Veja teamMembers

✅ ESPERADO:
   {
     "name": "Maria Silva",
     "username": "maria_silva",
     "password": "[HASH SHA-256 - 64 chars]",
     "passwordSalt": "[UUID]",
     "phone": "(11) 99999-1234"
   }
   
   NÃO É PLAINTEXT
```

---

## ⚠️ TESTES DE ERRO

### Teste 8.1: Simular conexão perdida
```
1. Abra DevTools (F12)
2. Network → Throttling → Offline
3. Tente criar tarefa
4. Verifique console

✅ ESPERADO:
   - Erro registrado em console.error
   - UI informa ao usuário (idealmente)
```

### Teste 8.2: Firestore sem regras
```
1. Remova regras do Firebase
2. Tente criar tarefa

✅ ESPERADO:
   - Acesso negado (erro do Firebase)
   - Mantenha sempre regras:
     ```
     allow read, write: if request.auth != null;
     ```
```

---

## ✅ CHECKLIST FINAL

- [ ] Login funciona (master, company, store, collaborator)
- [ ] Criar tarefas com/sem checklist
- [ ] Mover tarefas: A Fazer → Em Andamento → Concluído
- [ ] Upload de fotos em conclusão
- [ ] Adicionar/remover membros
- [ ] Definir escalas e rotinas
- [ ] Enviar/responder feedback
- [ ] Visualizar relatórios
- [ ] Dados aparecem corretamente no Firestore
- [ ] Senhas são hashed
- [ ] Sem erros no console
- [ ] Build final sem warnings

---

**Após completar todos os testes, seu sistema está pronto para produção! 🚀**
