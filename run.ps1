# RCC Excel Automation - one-click run
#
# Validates the environment, installs anything missing, starts both the
# backend and frontend dev servers (each in its own window so their logs
# stay visible), and waits until both report healthy before returning.
#
# Usage:  powershell -ExecutionPolicy Bypass -File run.ps1
#     or just double-click run.bat

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "    FAIL: $msg" -ForegroundColor Red }

# --- 1. Environment validation -------------------------------------------
Write-Step "Checking Python"
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Fail "Python not found on PATH. Install Python 3.12+ from https://python.org and re-run."
    exit 1
}
$pyVersionOutput = & python --version 2>&1
if ($pyVersionOutput -match "Python (\d+)\.(\d+)") {
    $major = [int]$Matches[1]; $minor = [int]$Matches[2]
    if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 12)) {
        Write-Fail "Python $major.$minor found, but 3.12+ is required."
        exit 1
    }
    Write-Ok "$pyVersionOutput"
} else {
    Write-Fail "Could not parse Python version from: $pyVersionOutput"
    exit 1
}

Write-Step "Checking Node.js"
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Fail "Node.js not found on PATH. Install Node 18+ from https://nodejs.org and re-run."
    exit 1
}
$nodeVersionOutput = & node --version
if ($nodeVersionOutput -match "v(\d+)\.") {
    $nodeMajor = [int]$Matches[1]
    if ($nodeMajor -lt 18) {
        Write-Fail "Node $nodeVersionOutput found, but 18+ is required."
        exit 1
    }
    Write-Ok "Node $nodeVersionOutput"
}

# --- 2. Backend setup -------------------------------------------------------
Write-Step "Backend environment"
if (-not (Test-Path $venvPython)) {
    Write-Host "    Creating virtual environment..."
    & python -m venv (Join-Path $backendDir ".venv")
}
Write-Host "    Installing/verifying backend dependencies..."
& $venvPython -m pip install -q -r (Join-Path $backendDir "requirements.txt")
if ($LASTEXITCODE -ne 0) { Write-Fail "pip install failed"; exit 1 }
Write-Ok "Backend dependencies ready"

# --- 3. Frontend setup -------------------------------------------------------
Write-Step "Frontend environment"
$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "    Installing frontend dependencies (this can take a minute)..."
    Push-Location $frontendDir
    npm install
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed"; exit 1 }
}
Write-Ok "Frontend dependencies ready"

# --- 4. Start both servers, each in its own visible window ------------------
Write-Step "Starting backend (http://127.0.0.1:8000)"
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$backendDir'; & '$venvPython' -m uvicorn app.main:app --port 8000 --host 127.0.0.1"
)

Write-Step "Starting frontend (http://localhost:3000)"
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$frontendDir'; npm run dev"
)

# --- 5. Wait for both to report healthy --------------------------------------
Write-Step "Waiting for both servers to become healthy"
function Wait-Healthy($url, $name, $timeoutSeconds = 60) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($resp.StatusCode -eq 200) { return $true }
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

$backendOk = Wait-Healthy "http://127.0.0.1:8000/api/health" "backend"
if ($backendOk) { Write-Ok "Backend healthy" } else { Write-Fail "Backend did not become healthy within timeout" }

$frontendOk = Wait-Healthy "http://localhost:3000" "frontend"
if ($frontendOk) { Write-Ok "Frontend healthy" } else { Write-Fail "Frontend did not become healthy within timeout" }

if ($backendOk -and $frontendOk) {
    Write-Host ""
    Write-Host "RCC Excel Automation is running:" -ForegroundColor Green
    Write-Host "  Frontend: http://localhost:3000"
    Write-Host "  Backend:  http://127.0.0.1:8000"
    Write-Host "(Each server is running in its own window - close those windows to stop them.)"
} else {
    Write-Host ""
    Write-Fail "One or more servers failed to start - check their windows for errors."
    exit 1
}
