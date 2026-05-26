param(
  [Parameter(Mandatory = $true)]
  [string]$EncryptedBackupPath,
  [string]$OutputPath = "data/restored-production.sqlite"
)

$ErrorActionPreference = "Stop"

$rawKey = [Environment]::GetEnvironmentVariable("DATA_ENCRYPTION_KEY")

if ([string]::IsNullOrWhiteSpace($rawKey) -or $rawKey.Length -lt 32) {
  throw "DATA_ENCRYPTION_KEY must be set to at least 32 characters to restore encrypted backups."
}

$resolvedBackup = Resolve-Path -LiteralPath $EncryptedBackupPath
$outputDir = Split-Path -Parent $OutputPath

if ($outputDir) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$inputBytes = [System.IO.File]::ReadAllBytes($resolvedBackup)
$version = [System.Text.Encoding]::UTF8.GetBytes("LMMENC1")

if ($inputBytes.Length -le ($version.Length + 16 + 32)) {
  throw "Encrypted backup is too small or invalid."
}

for ($index = 0; $index -lt $version.Length; $index++) {
  if ($inputBytes[$index] -ne $version[$index]) {
    throw "Encrypted backup version is invalid."
  }
}

$keyMaterial = [System.Text.Encoding]::UTF8.GetBytes($rawKey)
$sha = [System.Security.Cryptography.SHA256]::Create()
$key = $sha.ComputeHash($keyMaterial)
$sha.Dispose()

$payloadLength = $inputBytes.Length - 32
$payload = New-Object byte[] $payloadLength
$storedTag = New-Object byte[] 32
[Array]::Copy($inputBytes, 0, $payload, 0, $payloadLength)
[Array]::Copy($inputBytes, $payloadLength, $storedTag, 0, 32)

$hmac = [System.Security.Cryptography.HMACSHA256]::new($key)
$expectedTag = $hmac.ComputeHash($payload)
$hmac.Dispose()

$diff = 0
for ($index = 0; $index -lt $storedTag.Length; $index++) {
  $diff = $diff -bor ($storedTag[$index] -bxor $expectedTag[$index])
}

if ($diff -ne 0) {
  throw "Encrypted backup authentication failed. Check DATA_ENCRYPTION_KEY."
}

$iv = New-Object byte[] 16
$cipherLength = $payload.Length - $version.Length - $iv.Length
$cipherBytes = New-Object byte[] $cipherLength
[Array]::Copy($payload, $version.Length, $iv, 0, $iv.Length)
[Array]::Copy($payload, $version.Length + $iv.Length, $cipherBytes, 0, $cipherLength)

$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
$aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
$aes.KeySize = 256
$aes.Key = $key
$aes.IV = $iv

$decryptor = $aes.CreateDecryptor()
$plainBytes = $decryptor.TransformFinalBlock($cipherBytes, 0, $cipherBytes.Length)
$decryptor.Dispose()
$aes.Dispose()

[System.IO.File]::WriteAllBytes($OutputPath, $plainBytes)
Write-Host "Restored backup to: $OutputPath"
