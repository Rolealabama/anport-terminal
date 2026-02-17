# Script de Organização para Windows
# Execute: powershell -ExecutionPolicy Bypass -File .\scripts\organize.ps1

Write-Host "🚀 Iniciando reorganização do projeto..." -ForegroundColor Cyan

# Criar diretórios de destino
$directories = @(
    'src/components/modals',
    'src/components/sections',
    'src/components/boards',
    'src/components/auth',
    'src/components/admin',
    'src/config',
    'src/services',
    'src/utils',
    'src/types'
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✓ Criado: $dir" -ForegroundColor Green
    }
}

# Função auxiliar para mover arquivo
function Move-FileIfExists {
    param(
        [string]$Source,
        [string]$Destination
    )
    if (Test-Path $Source) {
        Move-Item -Path $Source -Destination $Destination -Force
        Write-Host "✓ Movido: $Source -> $Destination" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📁 Movendo componentes..." -ForegroundColor Cyan

# Modals
Move-FileIfExists "components/CompleteTaskModal.tsx" "src/components/modals/"
Move-FileIfExists "components/ConfirmationModal.tsx" "src/components/modals/"
Move-FileIfExists "components/NewTaskModal.tsx" "src/components/modals/"
Move-FileIfExists "components/TeamSettingsModal.tsx" "src/components/modals/"

# Sections
Move-FileIfExists "components/FeedbackSection.tsx" "src/components/sections/"
Move-FileIfExists "components/ReportsSection.tsx" "src/components/sections/"

# Boards
Move-FileIfExists "components/AdminStats.tsx" "src/components/boards/"
Move-FileIfExists "components/KanbanBoard.tsx" "src/components/boards/"
Move-FileIfExists "components/TeamBoard.tsx" "src/components/boards/"

# Auth
Move-FileIfExists "components/Login.tsx" "src/components/auth/"

# Admin
Move-FileIfExists "components/SuperAdminDashboard.tsx" "src/components/admin/"

# Root components
Move-FileIfExists "components/NotificationCenter.tsx" "src/components/"
Move-FileIfExists "components/TaskCard.tsx" "src/components/"

Write-Host ""
Write-Host "📄 Movendo arquivos de core..." -ForegroundColor Cyan

Move-FileIfExists "App.tsx" "src/"
Move-FileIfExists "index.tsx" "src/"
Move-FileIfExists "index.html" "src/"
Move-FileIfExists "firebase.ts" "src/services/"
Move-FileIfExists "types.ts" "src/types/"
Move-FileIfExists "utils.ts" "src/utils/"

# Mover arquivos de config
Move-FileIfExists "sw.js" "src/"
Move-FileIfExists "manifest.json" "src/"

# Limpar pasta de componentes se vazia
if ((Get-ChildItem -Path "components" -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
    Remove-Item "components" -ErrorAction SilentlyContinue
    Write-Host "✓ Removida pasta vazia: components" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Reorganização concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximas etapas:" -ForegroundColor Yellow
Write-Host "1. Atualize os imports em todos os arquivos"
Write-Host "2. Execute: npm test"
Write-Host "3. Execute: npm run build"
Write-Host ""
Write-Host "💡 Dica: Use 'npm run type-check' para encontrar imports quebrados" -ForegroundColor Cyan
