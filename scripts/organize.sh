#!/bin/bash
# Scripts de Organização - Executar Movimentações de Arquivos

echo "🚀 Iniciando reorganização do projeto..."

# Criar diretórios de destino
mkdir -p src/components/{modals,sections,boards,auth,admin}
mkdir -p src/config
mkdir -p src/services
mkdir -p src/utils
mkdir -p src/types

# Mover componentes para estrutura organizada
echo "📁 Movendo componentes..."

# Modals
mv components/CompleteTaskModal.tsx src/components/modals/ 2>/dev/null || true
mv components/ConfirmationModal.tsx src/components/modals/ 2>/dev/null || true
mv components/NewTaskModal.tsx src/components/modals/ 2>/dev/null || true
mv components/TeamSettingsModal.tsx src/components/modals/ 2>/dev/null || true

# Sections
mv components/FeedbackSection.tsx src/components/sections/ 2>/dev/null || true
mv components/ReportsSection.tsx src/components/sections/ 2>/dev/null || true

# Boards
mv components/AdminStats.tsx src/components/boards/ 2>/dev/null || true
mv components/KanbanBoard.tsx src/components/boards/ 2>/dev/null || true
mv components/TeamBoard.tsx src/components/boards/ 2>/dev/null || true

# Auth
mv components/Login.tsx src/components/auth/ 2>/dev/null || true

# Admin
mv components/SuperAdminDashboard.tsx src/components/admin/ 2>/dev/null || true

# Notificação (root)
mv components/NotificationCenter.tsx src/components/ 2>/dev/null || true
mv components/TaskCard.tsx src/components/ 2>/dev/null || true

# Mover arquivos de core
echo "📄 Movendo arquivos de core..."
mv App.tsx src/ 2>/dev/null || true
mv index.tsx src/ 2>/dev/null || true
mv index.html src/ 2>/dev/null || true
mv firebase.ts src/services/ 2>/dev/null || true
mv types.ts src/types/ 2>/dev/null || true
mv utils.ts src/utils/ 2>/dev/null || true

# Mover arquivos de config
mv sw.js src/ 2>/dev/null || true
mv manifest.json src/ 2>/dev/null || true

echo "✅ Reorganização concluída!"
echo ""
echo "Próximas etapas:"
echo "1. Atualize os imports em todos os arquivos"
echo "2. Execute: npm test"
echo "3. Execute: npm run build"
echo ""
echo "💡 Dica: Use 'npm run type-check' para encontrar imports quebrados"
