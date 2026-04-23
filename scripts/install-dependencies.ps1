# Установка зависимостей NeBeri (Windows PowerShell).
# Запуск из корня репозитория:  powershell -ExecutionPolicy Bypass -File scripts/install-dependencies.ps1

$ErrorActionPreference = "Stop"
$Root = if ($PSScriptRoot) { (Resolve-Path (Join-Path $PSScriptRoot "..")).Path } else { (Get-Location).Path }
Set-Location $Root

Write-Host "== Python (apps/api) ==" -ForegroundColor Cyan
python -m pip install --upgrade pip
python -m pip install -r apps/api/requirements.txt

Write-Host "== Node (apps/web) ==" -ForegroundColor Cyan
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Warning "npm не найден в PATH. Установите Node.js 22+ и выполните: cd apps/web; npm install; npm run test"
} else {
    Set-Location (Join-Path $Root "apps/web")
    npm install
    npm run test
    Set-Location $Root
}

Write-Host "== Готово ==" -ForegroundColor Green
