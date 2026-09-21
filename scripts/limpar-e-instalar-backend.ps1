# IMPORTANTE: Feche o Cursor e todos os terminais antes de rodar este script.
# Erro EPERM = algum processo (Cursor, antivirus) esta travando arquivos.
#
# Como usar:
#   1. Feche o Cursor por completo.
#   2. Abra PowerShell (pode ser "Como administrador").
#   3. cd "C:\Users\DAVI RESENDE\Downloads\VBSOLUTIONN\vbsolutionnn"
#   4. .\scripts\limpar-e-instalar-backend.ps1

$backend = Join-Path $PSScriptRoot "..\backend"
Set-Location $backend

Write-Host "=== Limpando e reinstalando backend ===" -ForegroundColor Cyan
Write-Host ""

# Nao deletar: so renomear (evita EPERM em pastas travadas)
if (Test-Path "node_modules") {
    Write-Host "Renomeando node_modules para node_modules.bak ..." -ForegroundColor Yellow
    $bak = "node_modules.bak." + (Get-Date -Format "yyyyMMddHHmm")
    Rename-Item -Path "node_modules" -NewName $bak -Force -ErrorAction SilentlyContinue
    if (Test-Path "node_modules") {
        Write-Host "ERRO: Nao foi possivel renomear. Feche o Cursor e qualquer programa usando a pasta e tente de novo." -ForegroundColor Red
        exit 1
    }
    Write-Host "Ok. Pasta antiga salva como $bak" -ForegroundColor Green
}

Write-Host "Limpando cache do npm ..." -ForegroundColor Yellow
npm cache clean --force 2>$null

Write-Host "Instalando dependencias (pode demorar 5+ min, baileys vem do GitHub)..." -ForegroundColor Green
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Backend instalado com sucesso." -ForegroundColor Green
    Write-Host "Abra o Cursor, va na pasta frontend e rode: npm run dev" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Se deu ENOENT em baileys: rode de novo (npm install) na pasta backend." -ForegroundColor Yellow
    Write-Host "Se deu EPERM: feche Cursor, antivirus e rode este script de novo." -ForegroundColor Yellow
    Write-Host "Se deu caminho longo: copie o projeto para C:\vb e instale la." -ForegroundColor Yellow
}
