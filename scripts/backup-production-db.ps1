param(
  [string]$DbPath = "data/production.sqlite",
  [string]$BackupDir = "backups",
  [switch]$Plain
)

$ErrorActionPreference = "Stop"

$resolvedDb = Resolve-Path -LiteralPath $DbPath
$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$resolvedBackupDir = Join-Path $root $BackupDir

New-Item -ItemType Directory -Force -Path $resolvedBackupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $resolvedBackupDir "production-$timestamp.sqlite"

if ($Plain) {
  Copy-Item -LiteralPath $resolvedDb -Destination $backupPath
  Write-Host "Plain backup created: $backupPath"
  exit 0
}

$rawKey = [Environment]::GetEnvironmentVariable("DATA_ENCRYPTION_KEY")

if ([string]::IsNullOrWhiteSpace($rawKey) -or $rawKey.Length -lt 32) {
  throw "DATA_ENCRYPTION_KEY must be set to at least 32 characters to create encrypted backups. Use -Plain only for local debugging."
}

$plainBytes = [System.IO.File]::ReadAllBytes($resolvedDb)
$keyMaterial = [System.Text.Encoding]::UTF8.GetBytes($rawKey)
$sha = [System.Security.Cryptography.SHA256]::Create()
$key = $sha.ComputeHash($keyMaterial)
$sha.Dispose()

$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
$aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
$aes.KeySize = 256
$aes.Key = $key
$aes.GenerateIV()

$encryptor = $aes.CreateEncryptor()
$cipherBytes = $encryptor.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)
$encryptor.Dispose()

$hmac = [System.Security.Cryptography.HMACSHA256]::new($key)
$version = [System.Text.Encoding]::UTF8.GetBytes("LMMENC1")
$payload = New-Object byte[] ($version.Length + $aes.IV.Length + $cipherBytes.Length)
[Array]::Copy($version, 0, $payload, 0, $version.Length)
[Array]::Copy($aes.IV, 0, $payload, $version.Length, $aes.IV.Length)
[Array]::Copy($cipherBytes, 0, $payload, $version.Length + $aes.IV.Length, $cipherBytes.Length)
$tag = $hmac.ComputeHash($payload)
$hmac.Dispose()
$aes.Dispose()

$encryptedPath = "$backupPath.enc"
$output = New-Object byte[] ($payload.Length + $tag.Length)
[Array]::Copy($payload, 0, $output, 0, $payload.Length)
[Array]::Copy($tag, 0, $output, $payload.Length, $tag.Length)
[System.IO.File]::WriteAllBytes($encryptedPath, $output)

Write-Host "Encrypted backup created: $encryptedPath"
