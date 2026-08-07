# RCC Excel Automation - one-click update
#
# Pulls the latest changes on the current branch and reinstalls any changed
# dependencies. Safe to run any time - does not touch uncommitted changes
# (fails loudly instead of overwriting anything).
#
# Usage:  powershell -ExecutionPolicy Bypass -File update.ps1
#     or just double-click update.bat

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

Push-Location $root

Write-Step "Checking for uncommitted changes"
$status = git status --porcelain
if ($status) {
    Write-Host "Uncommitted changes present - commit or stash them before updating:" -ForegroundColor Yellow
    Write-Host $status
    Pop-Location
    exit 1
}

Write-Step "Pulling latest changes"
git pull --ff-only

Write-Step "Updating backend dependencies"
if (Test-Path $venvPython) {
    & $venvPython -m pip install -q -r (Join-Path $backendDir "requirements.txt")
} else {
    Write-Host "    No backend virtual environment found yet - run run.ps1 first." -ForegroundColor Yellow
}

Write-Step "Updating frontend dependencies"
Push-Location $frontendDir
npm install
Pop-Location

Pop-Location
Write-Host ""
Write-Host "Update complete. Run run.ps1 (or run.bat) to start the app." -ForegroundColor Green
