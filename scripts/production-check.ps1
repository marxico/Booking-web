$ErrorActionPreference = "Stop"

$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $root ".env"
$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Error([string]$Message) {
  $errors.Add($Message) | Out-Null
}

function Add-Warning([string]$Message) {
  $warnings.Add($Message) | Out-Null
}

function Read-DotEnv([string]$Path) {
  $values = @{}

  if (-not (Test-Path -LiteralPath $Path)) {
    Add-Error ".env is missing. Copy .env.example to .env and fill production values."
    return $values
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $parts = $line.Split("=", 2)
    $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
  }

  return $values
}

$envValues = Read-DotEnv $envPath
$required = @(
  "SITE_URL",
  "DB_PATH",
  "DATA_ENCRYPTION_KEY",
  "ADMIN_PASSWORD",
  "SQUARE_ENVIRONMENT",
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_APP_ID",
  "SQUARE_LOCATION_ID",
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY"
)

foreach ($name in $required) {
  $value = [string]$envValues[$name]

  if ([string]::IsNullOrWhiteSpace($value)) {
    Add-Error "$name is missing in .env."
    continue
  }

  if ($value -match "REPLACE_WITH|replace-with|changeme|change-me") {
    Add-Error "$name still contains a placeholder value."
  }
}

if ($envValues["SITE_URL"] -and $envValues["SITE_URL"] -notmatch "^https://") {
  Add-Error "SITE_URL must use HTTPS in production."
}

if ($envValues["DATA_ENCRYPTION_KEY"] -and ([string]$envValues["DATA_ENCRYPTION_KEY"]).Length -lt 32) {
  Add-Error "DATA_ENCRYPTION_KEY must be at least 32 characters."
}

$weakAdminPasswords = @("admin", "password", "change-me-admin", "changeme", "12345678")
if ($weakAdminPasswords -contains ([string]$envValues["ADMIN_PASSWORD"]).ToLowerInvariant()) {
  Add-Error "ADMIN_PASSWORD is weak."
}

$distIndex = Join-Path $root "frontend/dist/index.html"
if (-not (Test-Path -LiteralPath $distIndex)) {
  Add-Error "frontend/dist/index.html is missing. Run npm run build."
}

$plainBackups = Get-ChildItem -LiteralPath (Join-Path $root "backups") -Filter "*.sqlite" -ErrorAction SilentlyContinue
if ($plainBackups) {
  Add-Error "Plain SQLite backups found in backups/. Remove or secure them before production: $($plainBackups.Name -join ', ')"
}

$legacyMockMatches = & rg "mock|MockCard|PAYMENT_PROVIDER_MODE" "$root\frontend" "$root\server" "$root\public" "$root\README.md" "$root\project-setup-instructions.txt" -n --glob "!frontend/dist/**" 2>$null
if ($LASTEXITCODE -eq 0 -and $legacyMockMatches) {
  Add-Error "Mock/test payment references remain:`n$legacyMockMatches"
}

if (-not (Test-Path -LiteralPath (Join-Path $root "Dockerfile"))) {
  Add-Warning "Dockerfile is missing."
}

if (-not (Test-Path -LiteralPath (Join-Path $root "docker-compose.yml"))) {
  Add-Warning "docker-compose.yml is missing."
}

if ($warnings.Count) {
  Write-Host "Warnings:" -ForegroundColor Yellow
  $warnings | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
}

if ($errors.Count) {
  Write-Host "Production check failed:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Production check passed." -ForegroundColor Green
