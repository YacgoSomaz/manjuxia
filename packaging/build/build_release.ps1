[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string]$Version,
  [switch]$Commercial,
  [ValidateSet("account", "license")] [string]$AuthMode = "account",
  [string]$AccountApiUrl = "https://anyq.site",
  [string]$AccountPublicKey = "",
  [string]$LicenseServerUrl = "",
  [string]$LicensePublicKey = "",
  [string]$ProductCode = "comic_shrimp",
  [string]$IntegrityPublicKey = "",
  [string]$UpdatePublicKey = "",
  [string]$CodeSignThumbprint = "",
  [string]$SignTool = "",
  [string]$Python = "python",
  [string]$OutputRoot = "packaging/release",
  [switch]$SkipBackendCompile,
  [switch]$DisableBackendCache,
  [switch]$SkipElectronBuild,
  [switch]$SkipInstallerCheck
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$output = Join-Path $projectRoot $OutputRoot
$stage = Join-Path $output "漫剧虾-$Version"

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
if ($Commercial -and $AuthMode -eq "license" -and [string]::IsNullOrWhiteSpace($LicenseServerUrl)) {
  throw "Commercial build requires -LicenseServerUrl"
}
if ($Commercial -and $AuthMode -eq "license" -and [string]::IsNullOrWhiteSpace($LicensePublicKey)) {
  throw "Commercial build requires -LicensePublicKey"
}
if ($Commercial -and $AuthMode -eq "account" -and [string]::IsNullOrWhiteSpace($AccountApiUrl)) {
  throw "Commercial account build requires -AccountApiUrl"
}
if ($Commercial -and $AuthMode -eq "account" -and [string]::IsNullOrWhiteSpace($AccountPublicKey)) {
  throw "Commercial account build requires -AccountPublicKey"
}
if ($Commercial -and [string]::IsNullOrWhiteSpace($IntegrityPublicKey)) {
  throw "Commercial build requires -IntegrityPublicKey"
}
if ($ProductCode -ne "comic_shrimp") {
  throw "漫剧虾构建的 ProductCode 必须固定为 comic_shrimp"
}
if ($Commercial -and [string]::IsNullOrWhiteSpace($UpdatePublicKey)) {
  throw "Commercial build requires -UpdatePublicKey (update-v1 public key)"
}
if ($Commercial -and $UpdatePublicKey -eq $AccountPublicKey) {
  throw "update-v1 public key must be distinct from account-v1 public key"
}

if (Test-Path -LiteralPath $stage) {
  Remove-Item -LiteralPath $stage -Recurse -Force
}
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$localKeyDir = Join-Path $env:LOCALAPPDATA "万山\build-keys"
if ([string]::IsNullOrWhiteSpace($IntegrityPublicKey)) {
  $keyJson = & $Python (Join-Path $PSScriptRoot "Ensure-Ed25519Key.py") $localKeyDir
  if ($LASTEXITCODE -ne 0) { throw "failed to prepare local manifest signing key" }
  $keyInfo = $keyJson | ConvertFrom-Json
  $IntegrityPublicKey = [string]$keyInfo.public
  if ([string]::IsNullOrWhiteSpace($env:WANSHAN_MANIFEST_PRIVATE_KEY)) {
    $env:WANSHAN_MANIFEST_PRIVATE_KEY = [string]$keyInfo.private
  }
  Write-Output "using local build signing key: $($keyInfo.key_dir)"
}
$releaseConfig = [ordered]@{
  app_name = "漫剧虾"
  version = $Version
  commercial = [bool]$Commercial
  auth_mode = $AuthMode
  account_api_url = $AccountApiUrl.TrimEnd("/")
  account_public_key = $AccountPublicKey
  product_code = $ProductCode
  license_server_url = $LicenseServerUrl
  license_public_key = $LicensePublicKey
  integrity_public_key = $IntegrityPublicKey
  update_public_key = $UpdatePublicKey
  integrity_manifest = "integrity_manifest.json"
}
$releaseConfigJson = $releaseConfig | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText(
  (Join-Path $stage "release_config.json"),
  $releaseConfigJson,
  [System.Text.UTF8Encoding]::new($false)
)

if (-not $SkipBackendCompile) {
  & (Join-Path $PSScriptRoot "Compile-Backend.ps1") -ReleaseDir $stage -Python $Python -DisableBackendCache:$DisableBackendCache
}
if (-not $SkipElectronBuild) {
  & (Join-Path $PSScriptRoot "Build-ElectronApp.ps1") -ReleaseDir $stage -Version $Version
}
if (-not $SkipElectronBuild) {
  & (Join-Path $PSScriptRoot "Verify-PackagedBackend.ps1") -ReleaseDir $stage
  if ($LASTEXITCODE -ne 0) { throw "packaged backend runtime verification failed" }
}

function Resolve-SignTool {
  if ($SignTool) {
    if (-not (Test-Path -LiteralPath $SignTool)) { throw "SignTool not found: $SignTool" }
    return (Resolve-Path -LiteralPath $SignTool).Path
  }
  $command = Get-Command "signtool.exe" -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $sdkRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
  if (Test-Path -LiteralPath $sdkRoot) {
    $candidate = Get-ChildItem -Path $sdkRoot -Filter "signtool.exe" -Recurse -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending | Select-Object -First 1
    if ($candidate) { return $candidate.FullName }
  }
  throw "signtool.exe not found"
}

function Sign-ReleaseBinary([string]$FilePath) {
  if ([string]::IsNullOrWhiteSpace($CodeSignThumbprint)) { return }
  if (-not $script:ResolvedSignTool) { $script:ResolvedSignTool = Resolve-SignTool }
  & $script:ResolvedSignTool sign /sha1 $CodeSignThumbprint /fd SHA256 /tr "http://timestamp.digicert.com" /td SHA256 /v $FilePath
  if ($LASTEXITCODE -ne 0) { throw "code signing failed: $FilePath" }
  if ((Get-AuthenticodeSignature -FilePath $FilePath).Status -ne "Valid") { throw "code signing verification failed: $FilePath" }
}

$mainExe = Join-Path $stage "漫剧虾.exe"
if (-not $SkipElectronBuild -and -not (Test-Path -LiteralPath $mainExe)) { throw "main executable missing: $mainExe" }
if (Test-Path -LiteralPath $mainExe) { Sign-ReleaseBinary $mainExe }

& $Python (Join-Path $PSScriptRoot "Generate-IntegrityManifest.py") $stage
if ($LASTEXITCODE -ne 0) { throw "integrity manifest generation failed" }
& (Join-Path $PSScriptRoot "Scan-Release.ps1") -ReleaseDir $stage

if (-not $SkipInstallerCheck) {
  $installerOut = Join-Path $output "installer\comic-shrimp\$Version"
  New-Item -ItemType Directory -Path $installerOut -Force | Out-Null
  $isccArgs = @("/DMyAppVersion=$Version", "/DReleaseDir=$stage", "/DInstallerOutputDir=$installerOut")
  if ($CodeSignThumbprint) {
    if (-not $script:ResolvedSignTool) { $script:ResolvedSignTool = Resolve-SignTool }
    $innoSignCommand = '$q' + $script:ResolvedSignTool + '$q sign /sha1 ' + $CodeSignThumbprint + ' /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /v $f'
    $isccArgs += "/DInnoSignTool=1"
    $isccArgs += "/Smanjuxia=$innoSignCommand"
  }
  & iscc @isccArgs (Join-Path $projectRoot "packaging\installer\万山.iss")
  if ($LASTEXITCODE -ne 0) { throw "Inno Setup installer build failed" }
  $installer = Join-Path $installerOut "漫剧虾Setup_$Version.exe"
  if (-not (Test-Path -LiteralPath $installer)) { throw "installer missing: $installer" }
  if ($CodeSignThumbprint -and (Get-AuthenticodeSignature -FilePath $installer).Status -ne "Valid") {
    throw "installer code signing verification failed: $installer"
  }
  $hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
  $bytes = (Get-Item -LiteralPath $installer).Length
  Write-Output "installer ready: $installer"
  Write-Output "release product_id: comic_shrimp"
  Write-Output "release version: $Version"
  Write-Output "release sha256: $hash"
  Write-Output "release bytes: $bytes"
  Write-Output "code signing: $(if ($CodeSignThumbprint) { 'valid' } else { 'pending' })"
}

Write-Output "release staging directory prepared: $stage"
