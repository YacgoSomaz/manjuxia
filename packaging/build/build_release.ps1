[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string]$Version,
  [switch]$Commercial,
  [string]$LicenseServerUrl = "",
  [string]$LicensePublicKey = "",
  [string]$OutputRoot = "packaging/release"
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
Require-Command "iscc" "Inno Setup ISCC.exe"
if ($Commercial -and [string]::IsNullOrWhiteSpace($LicenseServerUrl)) {
  throw "Commercial build requires -LicenseServerUrl"
}
if ($Commercial -and [string]::IsNullOrWhiteSpace($LicensePublicKey)) {
  throw "Commercial build requires -LicensePublicKey"
}

if (Test-Path -LiteralPath $stage) {
  Remove-Item -LiteralPath $stage -Recurse -Force
}
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$releaseConfig = [ordered]@{
  app_name = "万山"
  version = $Version
  commercial = [bool]$Commercial
  license_server_url = $LicenseServerUrl
  license_public_key = $LicensePublicKey
  integrity_manifest = "integrity_manifest.json"
}
$releaseConfig | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stage "release_config.json") -Encoding UTF8

Write-Warning "The source-to-binary compile steps are intentionally explicit: add the reviewed Nuitka/PyInstaller specs before producing a commercial installer."
Write-Output "release staging directory prepared: $stage"
Write-Output "next: compile backend modules, build launcher, run Generate-IntegrityManifest.py, run Scan-Release.ps1, then call Inno Setup."
