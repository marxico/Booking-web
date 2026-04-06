$projectRoot = Split-Path -Parent $PSScriptRoot
$logsDir = Join-Path $projectRoot 'logs'
$logFile = Join-Path $logsDir 'backend.log'

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

if (-not (Test-Path $logFile)) {
  New-Item -ItemType File -Path $logFile | Out-Null
}

Write-Host "Watching backend logs at $logFile"
Get-Content -Path $logFile -Wait
