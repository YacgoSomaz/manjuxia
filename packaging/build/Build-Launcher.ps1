[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string]$ReleaseDir,
  [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$release = (Resolve-Path -LiteralPath $ReleaseDir).Path
$backendDist = Join-Path $release "backend-dist"
$work = Join-Path $release ".pyinstaller-build"
$launcher = Join-Path $projectRoot "packaging/launcher/backend_launcher.py"

if (-not (Test-Path -LiteralPath (Join-Path $backendDist "backend-server.exe"))) {
  throw "compile the Nuitka backend before building the launcher"
}
if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
New-Item -ItemType Directory -Path $work -Force | Out-Null
& $Python -m PyInstaller --version | Out-Host
if ($LASTEXITCODE -ne 0) { throw "PyInstaller is not available through $Python -m PyInstaller" }
& $Python -m PyInstaller --onefile --noconsole --clean --name backend-launcher --distpath $backendDist --workpath $work --specpath $work $launcher
if ($LASTEXITCODE -ne 0) { throw "PyInstaller launcher build failed" }
if (-not (Test-Path -LiteralPath (Join-Path $backendDist "backend-launcher.exe"))) {
  throw "backend-launcher.exe missing"
}
Remove-Item -LiteralPath $work -Recurse -Force
Write-Output "PyInstaller launcher ready: $backendDist\backend-launcher.exe"
