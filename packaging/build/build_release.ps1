[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string]$Version,
  [switch]$Commercial,
  [string]$LicenseServerUrl = "",
  [string]$LicensePublicKey = "",
  [string]$ProductCode = "wanshan_media",
  [string]$IntegrityPublicKey = "",
  [string]$UpdateFeedUrl = "",
  [string]$UpdatePublicKey = "",
  [string]$UpdateInstallerUrl = "",
  [string]$OutputRoot = "packaging/release",
  [switch]$SkipBackendCompile,
  [switch]$SkipLauncherBuild,
  [switch]$SkipElectronBuild,
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

function Add-InnoSetupToPath() {
  if (Get-Command "iscc" -ErrorAction SilentlyContinue) { return }
  $candidates = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6",
    "$env:ProgramFiles\Inno Setup 6",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath (Join-Path $candidate "ISCC.exe")) {
      $env:Path = "$candidate;$env:Path"
      return
    }
  }
}

Require-Command "python"
Require-Command "node"
Require-Command "git-lfs"
if (-not $SkipInstallerCheck) {
  Add-InnoSetupToPath
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

$localKeyDir = Join-Path $env:LOCALAPPDATA "万山\build-keys"
if ([string]::IsNullOrWhiteSpace($IntegrityPublicKey)) {
  $keyJson = & python (Join-Path $PSScriptRoot "Ensure-Ed25519Key.py") $localKeyDir
  if ($LASTEXITCODE -ne 0) { throw "failed to prepare local manifest signing key" }
  $keyInfo = $keyJson | ConvertFrom-Json
  $IntegrityPublicKey = [string]$keyInfo.public
  if ([string]::IsNullOrWhiteSpace($env:WANSHAN_MANIFEST_PRIVATE_KEY)) {
    $env:WANSHAN_MANIFEST_PRIVATE_KEY = [string]$keyInfo.private
  }
  Write-Output "using local build signing key: $($keyInfo.key_dir)"
}
if ([string]::IsNullOrWhiteSpace($UpdatePublicKey)) {
  $UpdatePublicKey = $IntegrityPublicKey
}

$releaseConfig = [ordered]@{
  app_name = "万山"
  version = $Version
  commercial = [bool]$Commercial
  product_code = $ProductCode
  license_server_url = $LicenseServerUrl
  license_public_key = $LicensePublicKey
  integrity_public_key = $IntegrityPublicKey
  update_feed_url = $UpdateFeedUrl
  update_public_key = $UpdatePublicKey
  integrity_manifest = "integrity_manifest.json"
}
$releaseConfig | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stage "release_config.json") -Encoding UTF8

if (-not $SkipBackendCompile) {
  & (Join-Path $PSScriptRoot "Compile-Backend.ps1") -ReleaseDir $stage
}
if (-not $SkipLauncherBuild) {
  & (Join-Path $PSScriptRoot "Build-Launcher.ps1") -ReleaseDir $stage
}
if (-not $SkipElectronBuild) {
  & (Join-Path $PSScriptRoot "Build-ElectronApp.ps1") -ReleaseDir $stage -Version $Version
}

& python (Join-Path $PSScriptRoot "Generate-IntegrityManifest.py") $stage
if ($LASTEXITCODE -ne 0) { throw "integrity manifest generation failed" }
& (Join-Path $PSScriptRoot "Scan-Release.ps1") -ReleaseDir $stage

if (-not $SkipInstallerCheck) {
  $installerOut = Join-Path $output "installer"
  New-Item -ItemType Directory -Path $installerOut -Force | Out-Null
  & iscc /DMyAppVersion="$Version" /DReleaseDir="$stage" /DInstallerOutputDir="$installerOut" (Join-Path $projectRoot "packaging\installer\万山.iss")
  if ($LASTEXITCODE -ne 0) { throw "Inno Setup installer build failed" }
  $installer = Join-Path $installerOut "万山Setup_$Version.exe"
  if (-not (Test-Path -LiteralPath $installer)) { throw "installer missing: $installer" }
  if (-not [string]::IsNullOrWhiteSpace($UpdateInstallerUrl)) {
    & python (Join-Path $PSScriptRoot "Generate-UpdateManifest.py") --installer $installer --version $Version --url $UpdateInstallerUrl --output (Join-Path $installerOut "update.json")
    if ($LASTEXITCODE -ne 0) { throw "update manifest generation failed" }
  }
  Write-Output "installer ready: $installer"
}

Write-Output "release staging directory prepared: $stage"
