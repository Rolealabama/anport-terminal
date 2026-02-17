# 🔒 Guia de Segurança - Projeto Kanban V2

## 📋 Índice

1. [Variáveis de Ambiente](#variáveis-de-ambiente)
2. [GitHub Secrets](#github-secrets)
3. [Superadmin](#superadmin)
4. [Firebase Security Rules](#firebase-security-rules)
5. [Melhores Práticas](#melhores-práticas)

---

## 🔐 Variáveis de Ambiente

### **Arquivo `.env` (Local - NÃO COMMITAR)**

O arquivo `.env` contém credenciais sensíveis e **NUNCA deve ser commitado** no Git.

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
VITE_FIREBASE_APP_ID=seu-app-id
VITE_FIREBASE_MEASUREMENT_ID=seu-measurement-id
VITE_FIREBASE_VAPID_KEY=seu-vapid-key

# SuperAdmin (CRÍTICO - Nunca compartilhar)
VITE_SUPERADMIN_USERNAME=seu-usuario-admin
VITE_SUPERADMIN_PASSWORD=senha-super-forte-aqui

# Optional
GEMINI_API_KEY=sua-gemini-key
```

### **Proteções no `.gitignore`**

O `.gitignore` já está configurado para proteger:

```gitignore
# Env and secrets
.env
.env.*
!.env.example
*.secret
*.secrets
```

✅ **Verificado**: `.env` não será enviado ao GitHub

---

## 🔑 GitHub Secrets

### **Como Configurar Secrets no Repositório**

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Adicione cada variável:

#### **Secrets Obrigatórios:**

| Nome do Secret | Descrição | Exemplo |
|----------------|-----------|---------|
| `VITE_FIREBASE_API_KEY` | API Key do Firebase | `AIzaSyAbc123...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain | `projeto.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | `projeto-12345` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket | `projeto.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | `123456789012` |
| `VITE_FIREBASE_APP_ID` | App ID | `1:123:web:abc` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID | `G-XXXXXXXXXX` |
| `VITE_FIREBASE_VAPID_KEY` | VAPID Key | `BNx...==` |
| `VITE_SUPERADMIN_USERNAME` | Usuário SuperAdmin | `admin-producao` |
| `VITE_SUPERADMIN_PASSWORD` | Senha SuperAdmin | `senha-super-segura-123!` |
| `FIREBASE_SERVICE_ACCOUNT` | Service Account JSON | `{"type": "service_account",...}` |
| `CODECOV_TOKEN` | Token Codecov (opcional) | `abc-123-xyz` |

### **Uso nos Workflows**

Os secrets são injetados nos workflows via `${{ secrets.NOME_DO_SECRET }}`:

```yaml
env:
  VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
  VITE_SUPERADMIN_USERNAME: ${{ secrets.VITE_SUPERADMIN_USERNAME }}
```

---

## 👑 SuperAdmin

### **Segurança do SuperAdmin**

O SuperAdmin tem **acesso total** ao sistema. Proteja estas credenciais:

#### **Boas Práticas:**

1. ✅ **Nunca compartilhar** usuário/senha do SuperAdmin
2. ✅ **Rotacionar senha** regularmente (a cada 3-6 meses)
3. ✅ **Usar senhas fortes**: mínimo 16 caracteres, com números, letras e símbolos
4. ✅ **Limitar acesso**: Apenas admins do sistema devem ter acesso
5. ✅ **Monitorar logs**: Revisar ações do SuperAdmin periodicamente
6. ✅ **Autenticação 2FA**: Considere implementar 2FA para SuperAdmin

#### **Recomendações de Senha:**

```bash
# Senha FRACA (NÃO usar):
master123

# Senha FORTE (usar):
K@nb4n!Pr0d-2026$Adm1n#S3cur3
```

#### **Gerador de Senha (PowerShell):**

```powershell
# Gerar senha forte aleatória
-join ((48..57) + (65..90) + (97..122) + (33, 35, 36, 37, 38, 42, 43, 45, 61, 63, 64) | Get-Random -Count 20 | ForEach-Object {[char]$_})
```

### **Ambiente de Desenvolvimento vs Produção**

```bash
# .env (Desenvolvimento Local)
VITE_SUPERADMIN_USERNAME=superadmin
VITE_SUPERADMIN_PASSWORD=master123

# GitHub Secrets (Produção)
VITE_SUPERADMIN_USERNAME=admin-producao-2026
VITE_SUPERADMIN_PASSWORD=K@nb4n!Pr0d-2026$Adm1n#S3cur3
```

⚠️ **NUNCA use credenciais de produção em desenvolvimento!**

---

## 🛡️ Firebase Security Rules

### **Regras V2 (firestore-v2.rules)**

As regras de segurança estão em `firestore-v2.rules` e incluem:

```javascript
// Exemplo de regra segura
match /companies/{companyId} {
  // Apenas superadmin pode criar empresas
  allow create: if isSuperAdmin();
  
  // Apenas admin da empresa pode ler/atualizar
  allow read, update: if isCompanyAdmin(companyId);
}
```

### **Deploy das Regras:**

```bash
firebase deploy --only firestore:rules
```

---

## ✅ Melhores Práticas

### **1. Nunca Commitar Credenciais**

```bash
# ❌ NUNCA faça isso:
git add .env
git commit -m "adicionando config"

# ✅ SEMPRE use .gitignore:
# O arquivo .env já está ignorado
```

### **2. Revisar Código Antes de Push**

```bash
# Verificar o que será commitado:
git status
git diff --cached

# Procurar por credenciais acidentais:
git grep -i "api.*key"
git grep -i "password"
```

### **3. Rotação de Secrets**

- 🔄 **Firestore API Keys**: A cada 6 meses
- 🔄 **SuperAdmin Password**: A cada 3 meses
- 🔄 **Service Accounts**: A cada 12 meses

### **4. Auditoria de Acesso**

```typescript
// Registrar todas as ações do SuperAdmin
if (user.role === Role.DEV) {
  AuditService.log({
    userId: user.id,
    action: 'SUPERADMIN_ACTION',
    details: { /* ... */ },
    timestamp: Date.now(),
  });
}
```

### **5. Ambientes Separados**

```
├── .env (desenvolvimento local)
├── .env.staging (GitHub Secrets - staging)
└── .env.production (GitHub Secrets - produção)
```

---

## 🚨 Em Caso de Vazamento

Se credenciais forem expostas acidentalmente:

### **Ação Imediata:**

1. **Firebase API Keys**: Regenerar no Firebase Console
2. **SuperAdmin Password**: Atualizar no código e GitHub Secrets
3. **Service Account**: Revogar e criar novo
4. **Limpar histórico Git** (se commitado):

```bash
# Remover arquivo do histórico Git
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (CUIDADO!)
git push origin --force --all
```

5. **Notificar a equipe**
6. **Revisar logs de acesso**

### **Prevenção:**

- Use **git-secrets** ou **truffleHog** para scan automático
- Configure **pre-commit hooks**
- Ative **alertas do GitHub** para secrets expostos

---

## 📞 Suporte

Para questões de segurança:

- **Email**: security@seuprojeto.com
- **Urgente**: Entre em contato com o administrador do sistema

---

**Última atualização**: Fevereiro 2026  
**Versão**: 2.0
