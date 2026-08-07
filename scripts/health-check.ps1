# RCC Excel Automation - health check
#
# Quick standalone check of whether both servers are up and responding,
# without starting or stopping anything. Useful for verifying a `run.ps1`
# launch succeeded, or for diagnosing "it's not working" reports.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\health-check.ps1

function Check($name, $url) {
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($resp.StatusCode -eq 200) {
            Write-Host "[OK]   $name ($url)" -ForegroundColor Green
            return $true
        }
        Write-Host "[FAIL] $name ($url) - HTTP $($resp.StatusCode)" -ForegroundColor Red
        return $false
    } catch {
        Write-Host "[FAIL] $name ($url) - not reachable: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

$backendOk = Check "Backend" "http://127.0.0.1:8000/api/health"
$frontendOk = Check "Frontend" "http://localhost:3000"

if ($backendOk -and $frontendOk) {
    Write-Host ""
    Write-Host "Both servers are healthy." -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "One or more servers are not responding. Run run.ps1 to (re)start them." -ForegroundColor Yellow
    exit 1
}
