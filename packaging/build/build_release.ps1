[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string]$Version,
  [switch]$Commercial,
  [string]$LicenseServerUrl = "",
  [string]$LicensePublicKey = "",
  [string]$ProductCode = "wanshan",
  [string]$IntegrityPublicKey = "",
  [string]$OutputRoot = "packaging/release",
  [switch]$SkipBackendCompile,
  [switch]$SkipLauncherBuild,
  [switch]$SkipInstallerCheck
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$output = Join-Path $projectRoot $OutputRoot
$stage = Join-Path $output "万山-$Version"

function Require-Command([string]$Name, [string]$Hint = $Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "missing build tool: $Hint"
  }
}

Require-Command "python"
Require-Command "node"
Require-Command "git-lfs"
if (-not $SkipInstallerCheck) {
  Require-Command "iscc" "Inno Setup ISCC.exe"
}
if ($Commercial -and [string]::IsNullOrWhiteSpace($LicenseServerUrl)) {
  throw "Commercial build requires -LicenseServerUrl"
}
if ($Commercial -and [string]::IsNullOrWhiteSpace($LicensePublicKey)) {
  throw "Commercial build requires -LicensePublicKey"
}
if ($Commercial -and [string]::IsNullOrWhiteSpace($IntegrityPublicKey)) {
  throw "Commercial build requires -IntegrityPublicKey"
}
if ($ProductCode -notmatch '^[A-Za-z0-9_.-]+$') {
  throw "ProductCode must contain only ASCII letters, numbers, dot, underscore, or hyphen"
}

if (Test-Path -LiteralPath $stage) {
  Remove-Item -LiteralPath $stage -Recurse -Force
}
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$releaseConfig = [ordered]@{
  app_name = "万山"
  version = $Version
  commercial = [bool]$Commercial
  product_code = $ProductCode
  license_server_url = $LicenseServerUrl
  license_public_key = $LicensePublicKey
  integrity_public_key = $IntegrityPublicKey
  integrity_manifest = "integrity_manifest.json"
}
$releaseConfig | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stage "release_config.json") -Encoding UTF8

if (-not $SkipBackendCompile) {
  & (Join-Path $PSScriptRoot "Compile-Backend.ps1") -ReleaseDir $stage
}
if (-not $SkipLauncherBuild) {
  & (Join-Path $PSScriptRoot "Build-Launcher.ps1") -ReleaseDir $stage
}

Write-Output "release staging directory prepared: $stage"
Write-Output "next: copy packaged Electron frontend, run Generate-IntegrityManifest.py, run Scan-Release.ps1, then call Inno Setup."
