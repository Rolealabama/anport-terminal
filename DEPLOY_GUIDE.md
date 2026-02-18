# 🚀 Guia de Deploy e Configuração

## 📋 Pré-requisitos

- Node.js 20+
- Conta Firebase
- Conta GitHub (para CI/CD)
- Git instalado

---

## 🔧 Configuração Inicial

### **1. Clone o Repositório**

```bash
git clone https://github.com/seu-usuario/projetoKamban.git
cd projetoKamban
```

### **2. Instale Dependências**

```bash
npm install
```

### **3. Configure Firebase**

#### **3.1. Crie um Projeto no Firebase Console**

1. Acesse https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Siga o wizard de criação

#### **3.2. Ative os Serviços Necessários**

- ✅ **Firestore Database** (modo produção)
- ✅ **Authentication** (obrigatório: app usa Firebase Auth)
- ✅ **Hosting** (para deploy)
- ✅ **Cloud Functions** (obrigatório: login usa callable `loginWithPassword`)

#### **3.3. Obtenha as Credenciais**

1. No Firebase Console, vá em **Configurações do Projeto** (⚙️)
2. Em "Seus apps", clique no ícone Web `</>`
3. Copie as credenciais exibidas

### **4. Configure Variáveis de Ambiente Locais**

```bash
# Copie o template
cp .env.example .env

# Edite o .env com suas credenciais
nano .env  # ou use seu editor preferido
```

Preencha com as credenciais do Firebase:

```env
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
VITE_FIREBASE_APP_ID=seu-app-id
VITE_FIREBASE_MEASUREMENT_ID=seu-measurement-id
VITE_FIREBASE_VAPID_KEY=seu-vapid-key
```

### **5. Deploy das Regras de Segurança**

```bash
# Login no Firebase
firebase login

# Inicialize o projeto (se necessário)
firebase init

# Deploy das regras
firebase deploy --only firestore:rules
```

### **5.1 Deploy das Cloud Functions (Login + Push)**

O login V2 usa a callable `loginWithPassword` para validar usuário/senha no Firestore e emitir um custom token do Firebase Auth.

```bash
firebase deploy --only functions
```

### **6. Rode o Projeto Localmente**

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 🏗️ Build para Produção

```bash
# Build otimizado
npm run build

# Preview do build
npm run preview
```

---

## 🚀 Deploy

### **Opção 1: Deploy Manual (Firebase Hosting)**

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### **Opção 2: Deploy Automático (GitHub Actions)**

#### **2.1. Configure Secrets no GitHub**

Vá em **Settings** → **Secrets and variables** → **Actions** e adicione:

**Secrets Firebase:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_VAPID_KEY`

**Secrets SuperAdmin:**
- `VITE_SUPERADMIN_USERNAME`
- `VITE_SUPERADMIN_PASSWORD`

**Service Account:**
```bash
# Gere o Service Account
firebase projects:list
firebase init hosting

# Copie o JSON gerado
cat firebase-service-account.json

# Adicione como secret FIREBASE_SERVICE_ACCOUNT
```

#### **2.2. Push para GitHub**

```bash
git add .
git commit -m "chore: configuração inicial"
git push origin main
```

O GitHub Actions fará o deploy automaticamente! 🎉

---

## 📊 Monitoramento

### **Logs do Firebase**

```bash
firebase functions:log
```

### **Testes**

```bash
# Testes unitários
npm run test

# Testes com cobertura
npm run test:coverage

# Testes E2E
npm run test:e2e
```

---

## 🔄 Atualizar Produção

```bash
# 1. Pull das últimas mudanças
git pull origin main

# 2. Instale dependências
npm install

# 3. Rode testes
npm run test:ci

# 4. Build
npm run build

# 5. Deploy
firebase deploy
```

---

## 🛠️ Manutenção

### **Backup do Firestore**

```bash
gcloud firestore export gs://seu-bucket/backups/$(date +%Y%m%d)
```

### **Limpar Build Artifacts**

```bash
rm -rf dist coverage node_modules
npm install
```

### **Atualizar Dependências**

```bash
# Verificar atualizações
npm outdated

# Atualizar (cuidado!)
npm update
```

---

## ⚠️ Troubleshooting

### **Erro: Firebase não configurado**

```
✗ Verifique se o .env existe e tem as credenciais corretas
✗ Confirme que o Firebase está inicializado
```

### **Erro: Build falha**

```bash
# Limpe o cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **Erro: Deploy falha**

```bash
# Verifique autenticação
firebase login --reauth

# Verifique projeto
firebase use --add
```

---

## 📞 Suporte

- **Documentação Firebase**: https://firebase.google.com/docs
- **Documentação Vite**: https://vitejs.dev/
- **Issues**: https://github.com/seu-usuario/projetoKamban/issues

---

**Criado**: Fevereiro 2026  
**Versão**: 2.0
