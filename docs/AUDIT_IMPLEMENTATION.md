# 🔐 Guia de Implementação - Auditoria de Fotos

## 📋 Resumo das Mudanças Implementadas

### 1. **Tipos e Interfaces (types.ts)**
✅ Adicionados metadados de auditoria a `TaskAttachment`:
```typescript
export interface TaskAttachment {
  name: string;
  type: string;
  data: string;
  uploadedBy?: string;       // Quem enviou
  uploadedAt?: number;       // Quando enviou
  uploadedByRole?: Role;     // Role de quem enviou
}

export interface PhotoAuditLog {
  id: string;
  taskId: string;
  photoName: string;
  viewedBy: string;          // Quem visualizou
  viewedByRole: Role;        // Role de quem visualizou
  viewedAt: number;          // Quando visualizou
  action: 'view' | 'download' | 'print' | 'upload';
  storeId: string;
  createdAt: number;
}
```

---

## 🛠️ Componentes Atualizados

### 2. **App.tsx**
- ✅ Importa `PhotoAuditLog` do types
- ✅ Adiciona metadados ao salvar fotos
- ✅ Registra ação de upload na coleção `photo_audit_logs`

```typescript
const filesWithAudit = files.map(f => ({
  ...f,
  uploadedBy: user?.username,
  uploadedAt: Date.now(),
  uploadedByRole: user?.role
}));
```

### 3. **ReportsSection.tsx**
- ✅ Importa service de auditoria
- ✅ Registra visualizações de fotos
- ✅ Mostra informações de quem fez upload
- ✅ Expandable UI para ver detalhes de comprovação

```typescript
const handlePhotoView = async (task: Task, photoName: string) => {
  await addDoc(collection(db, "photo_audit_logs"), {
    taskId: task.id,
    photoName: photoName,
    viewedBy: currentUser.username,
    viewedByRole: currentUser.role,
    viewedAt: Date.now(),
    action: 'view',
    storeId: currentUser.storeId,
    createdAt: Date.now()
  });
};
```

### 4. **TaskCard.tsx**
- ✅ Registra visualizações quando alguém clica na prova
- ✅ Evita duplicação de registros (usa Set para rastrear)
- ✅ Passa `currentUser` como prop para auditoria

---

## 📚 Novo Serviço - PhotoAuditService

Localizado em: `services/PhotoAuditService.ts`

### Funções Disponíveis:

```typescript
// 1. Registrar uma ação
PhotoAuditService.logPhotoAction(
  taskId,
  photoName,
  viewedBy,
  viewedByRole,
  action, // 'view' | 'download' | 'print' | 'upload'
  storeId
);

// 2. Histórico de uma foto
const history = await PhotoAuditService.getPhotoViewHistory(photoName, storeId);

// 3. Auditoria de uma tarefa
const logs = await PhotoAuditService.getTaskAuditLog(taskId);

// 4. Histórico de visualizações de um usuário
const userHistory = await PhotoAuditService.getUserViewingHistory(username, storeId);

// 5. Gerar relatório de compliance
const report = await PhotoAuditService.generateAuditReport(storeId, 90);

// 6. Formatar para exibição legal
const formatted = PhotoAuditService.formatLogForCompliance(log);
```

---

## 🔒 Firestore Rules

Arquivo: `firestore.rules`

### Principais Regras Implementadas:

✅ **Tasks** - Somente admins podem gerenciar  
✅ **Photo Audit Logs** - Imutáveis, apenas para leitura by admin  
✅ **Store Config** - Isolado por loja  
✅ **Feedbacks** - Privacidade por sender/receiver  

### Como Aplicar:
1. Firebase Console → Firestore → Rules
2. Copiar conteúdo de `firestore.rules`
3. Publicar

---

## 🚀 Próximas Etapas de Implementação

### Fase 1: IMEDIATA (Hoje)
- [ ] Testar as mudanças em desenvolvimento
- [ ] Executar `npm test -- --run` para confirmar tipos
- [ ] Verificar storage de fotos em Firestore

### Fase 2: CURTO PRAZO (Esta semana)
- [ ] Aplicar Firestore Rules na produção
- [ ] Treinar admins sobre new "Auditoria Visual"
- [ ] Implementar UI para visualizar logs de auditoria

### Fase 3: MÉDIO PRAZO (Próximas 2 semanas)
```typescript
// Criar novo componente: components/AuditDashboard.tsx
// Mostrar:
// - Histórico de visualizações por foto
// - Relatórios de compliance
// - Quem acessou o quê e quando
```

### Fase 4: LONGO PRAZO (Mês que vem)
- [ ] Migrar para Firebase Storage (ao invés de Base64)
- [ ] Assinatura digital de fotos
- [ ] Retenção automática de logs (LGPD: 90 dias)

---

## 📊 Exemplo: Consultando Auditoria

```typescript
// Em um novo componente ou hook
import PhotoAuditService from '@/services/PhotoAuditService';

const generateReport = async () => {
  const report = await PhotoAuditService.generateAuditReport('STORE123', 30);
  
  console.log(`Total de ações: ${report.totalActions}`);
  console.log(`Visualizações: ${report.byAction.views}`);
  console.log(`Downloads: ${report.byAction.downloads}`);
  console.log(`Usuários que acessaram:`, report.byUser);
  
  // Exportar para CSV/PDF para compliance
};
```

---

## 🔍 Verificando Se Tudo Funciona

### 1. **Teste Local**
```bash
npm test -- --run
npm run type-check
```

### 2. **Teste em Desenvolvimento**
- Fazer upload de foto como colaborador
- Verificar se aparece em "Detalhes da Comprovação"
- Clicar ver foto e verificar Firestore
- Ir em Auditoria Visual → clique em foto
- Verificar se registrou em `photo_audit_logs`

### 3. **Firestore Console**
- Buscar coleção `photo_audit_logs`
- Verificar se há documentos com campos corretos:
  - `uploadedBy` (quando foto enviada)
  - `viewedBy` (quando foto visualizada)
  - `action` (tipo de ação)
  - `viewedAt` (timestamp)

---

## 📋 Campos de Auditoria Armazenados

Cada ação registra:

```json
{
  "taskId": "t1",
  "photoName": "foto.png",
  "viewedBy": "ana_silva",
  "viewedByRole": "collaborator",
  "viewedAt": 1708019200000,
  "action": "view",
  "storeId": "S1",
  "createdAt": 1708019200000
}
```

---

## 🛡️ Recursos de Segurança Implementados

| Recurso | Status | Descrição |
|---------|--------|-----------|
| Metadados de Upload | ✅ | Registra quem e quando enviou |
| Trilha de Visualização | ✅ | Logs imutáveis de quem viu |
| Controle de Acesso por Role | ✅ | Server-side rules |
| Isolamento por Loja | ✅ | Dados segregados |
| Relatório de Compliance | ✅ | `generateAuditReport()` |
| Imutabilidade de Logs | ✅ | Firestore Rules (no update) |
| Rastreamento de ações | ✅ | view/download/print/upload |

---

## ⚠️ Importante: Passando Props

Após TODAS essas mudanças, você precisa passar `currentUser` para componentes que usam auditoria:

```tsx
// Em App.tsx, quando renderiza components
<TaskCard 
  task={task} 
  currentUser={user}  // 👈 NOVO
  // ... outras props
/>

<ReportsSection 
  tasks={tasks}
  teamMembers={teamMembers}
  currentUser={user}  // 👈 Já estava, mas confirmar
/>
```

---

## 📝 Notas Legais (LGPD/GDPR)

✅ **O sistema agora registra**:
- Quem enviou a foto
- Quando enviou
- Quem visualizou
- Quando visualizou
- Qual foi a ação

⚠️ **Considere adicionar**:
- Política de retenção (ex: 90 dias)
- Funcionalidade de "direito ao esquecimento"
- Criptografia em repouso para fotos sensíveis
- Alertar usuários sobre rastreamento

---

## 🎯 Checklist Final

- [ ] Código compilado sem erros (`npm run type-check`)
- [ ] Testes passando (`npm test -- --run`)
- [ ] Firestore Rules aplicadas
- [ ] Props `currentUser` passadas para components
- [ ] Auditoria registrando (verificar Firestore)
- [ ] UI mostrando dados de auditoria
- [ ] Documentação comunicada ao time

---

## 📞 Suporte

Se encontrar erros:

1. **Erro de tipo `PhotoAuditLog`**: Confirme import em types.ts
2. **Erro de Firebase simples**: Verificar se `db` está exportado em firebase.ts
3. **Auditoria não registra**: Confirmar se `db` está configurado
4. **Props não passada**: Buscar `<TaskCard` e `<ReportsSection` em App.tsx

---

**Status**: ✅ Implementação Completa (Fase 1)  
**Última Atualização**: Fevereiro 2026  
**Próxima Etapa**: Testes e validação em desenvolvimento
