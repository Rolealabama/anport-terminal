# 🔍 ANÁLISE DE LIMPEZA - PROJETO KANBAN V2

## 📋 **Status Atual**

### **Arquivos V2 (Novos - MANTER):**
- ✅ `types-v2.ts` - Nova estrutura
- ✅ `services/AuthorizationService.ts`
- ✅ `services/HierarchyService.ts` 
- ✅ `services/KanbanService.ts`
- ✅ `services/TaskService.ts`
- ✅ `seed-data.ts`
- ✅ `migration-script.ts`
- ✅ `README_V2.md`
- ✅ `ARCHITECTURE_SUMMARY_V2.md`
- ✅ `EXECUTIVE_SUMMARY_V2.md`
- ✅ `IMPLEMENTATION_CHECKLIST_V2.md`
- ✅ `MIGRATION_GUIDE_V2.md`
- ✅ `TESTING_GUIDE_V2.md`

### **Arquivos V1 (Antigos - ANÁLISE NECESSÁRIA):**
- ✅ Removidos do frontend (migração big-bang para V2)

### **Testes de Regressão (REMOVER conforme solicitado):**
- ❌ `tests/e2e/regression.spec.ts`
- ❌ `tests/e2e/regression-trace.spec.ts`

### **Testes Unitários (ATUALIZAR para V2):**
- ✅ Atualizados: suíte agora foca nos módulos V2 (Auth/App/Services V2)

---

## 🎯 **ESTRATÉGIA DE LIMPEZA**

### **Fase 1: Remoção Segura**
1. ❌ Remover testes de regressão (conforme solicitado)
2. ❌ Remover `firestore.rules` (antigo, usar `firestore-v2.rules`)
3. ❌ Limpar scripts de organização obsoletos

### **Fase 2: Atualização**
1. ✅ Migrar frontend para V2-only
2. ✅ Atualizar testes unitários para V2

### **Fase 3: Documentação**
1. ✅ Criar guia de uso das variáveis de ambiente
2. ✅ Documentar processo de deploy com GitHub Secrets

---

## 🚫 **ARQUIVOS PARA REMOVER AGORA:**

### Testes de Regressão:
- `tests/e2e/regression.spec.ts`
- `tests/e2e/regression-trace.spec.ts`
- `tests/e2e/fixtures/*` (se usado apenas para regressão)

### Firestore Rules antigas:
- `firestore.rules` (usar firestore-v2.rules)

### Scripts de organização obsoletos:
- `scripts/organize.ps1` (obsoleto)
- `scripts/organize.sh` (obsoleto)  
- `scripts/organize-sourcemaps.js` (verificar necessidade)

---

## ✅ **ARQUIVOS PARA CRIAR:**

### GitHub Actions / CI:
- `.github/workflows/ci.yml` - Pipeline com testes e build
- `.github/workflows/deploy.yml` - Deploy automático

### Documentação:
- `SECURITY.md` - Guia de segurança
- `.env.production.example` - Template para produção

---

## 📊 **PRÓXIMOS PASSOS:**

1. ✅ Remover arquivos obsoletos identificados
2. ✅ Criar/atualizar testes unitários para serviços V2
3. ✅ Configurar GitHub Actions
4. ✅ Verificar cobertura de testes (meta: 90%+)
5. ✅ Preparar documentação final
