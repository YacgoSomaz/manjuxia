[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string]$ReleaseDir,
  [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$release = (Resolve-Path -LiteralPath $ReleaseDir).Path
$work = Join-Path $release ".nuitka-build"
$src = Join-Path $release ".nuitka-src"
$output = Join-Path $release "backend-dist"
$dataFile = Join-Path $projectRoot "backend/data/wanshan_prompt_seed.json"
$modelFile = Join-Path $projectRoot "backend/ml_models/face_detection_yunet_2023mar.onnx"

if (-not (Test-Path -LiteralPath $dataFile)) { throw "backend prompt seed missing: $dataFile" }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "backend/main.py"))) { throw "backend/main.py missing" }
if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
if (Test-Path -LiteralPath $src) { Remove-Item -LiteralPath $src -Recurse -Force }
if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Recurse -Force }
New-Item -ItemType Directory -Path $work,$src,$output -Force | Out-Null

$sourceItems = @("api", "database", "models", "services", "tools", "utils", "ml_models")
foreach ($item in $sourceItems) {
  $from = Join-Path $projectRoot "backend/$item"
  if (Test-Path -LiteralPath $from) {
    Copy-Item -LiteralPath $from -Destination $src -Recurse -Force
  }
}
Copy-Item -LiteralPath (Join-Path $projectRoot "backend/main.py") -Destination $src -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "backend/_version.py") -Destination $src -Force
Get-ChildItem -LiteralPath $src -Recurse -Directory -Filter "__pycache__" -Force | Remove-Item -Recurse -Force
if ($env:WANSHAN_ENABLE_QIANSHAN_LAB -ne "1") {
  $qianshanLabFiles = @(
    (Join-Path $src "api/qianshan_lab.py"),
    (Join-Path $src "services/qianshan_storyboard_lab.py")
  )
  foreach ($labFile in $qianshanLabFiles) {
    if (Test-Path -LiteralPath $labFile) {
      Remove-Item -LiteralPath $labFile -Force
    }
  }
}

$embedded = Join-Path $src "services/wanshan_prompt_seed_embedded.py"
$seedB64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($dataFile))
@"
import base64
import json

TEMPLATES = json.loads(base64.b64decode("$seedB64").decode("utf-8"))
"@ | Set-Content -LiteralPath $embedded -Encoding UTF8

& $Python -m nuitka --version | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Nuitka is not available through $Python -m nuitka" }

$args = @(
  "-m", "nuitka",
  "--standalone",
  "--assume-yes-for-downloads",
  "--output-dir=$work",
  "--output-filename=backend-server.exe",
  "--include-package=api",
  "--include-package=database",
  "--include-package=models",
  "--include-package=services",
  "--include-package=tools",
  "--include-package=utils",
  (Join-Path $src "main.py")
)
if (Test-Path -LiteralPath $modelFile) {
  $args = $args[0..($args.Count - 2)] + "--include-data-file=$modelFile=ml_models/face_detection_yunet_2023mar.onnx" + $args[-1]
}
& $Python @args
if ($LASTEXITCODE -ne 0) { throw "Nuitka backend compilation failed" }

$dist = Get-ChildItem -LiteralPath $work -Directory -Filter "*.dist" | Select-Object -First 1
if (-not $dist) { throw "Nuitka output directory not found" }
Copy-Item -Path (Join-Path $dist.FullName "*") -Destination $output -Recurse -Force

$optionalRuntimeDirs = @("scipy", "scipy.libs", "pandas", "pandas.libs")
foreach ($dirName in $optionalRuntimeDirs) {
  $candidate = Join-Path $output $dirName
  if (Test-Path -LiteralPath $candidate) {
    Remove-Item -LiteralPath $candidate -Recurse -Force
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $output "backend-server.exe"))) {
  throw "compiled backend-server.exe missing"
}
if (Get-ChildItem -LiteralPath $output -Recurse -File -Include *.py,*.pyc,*.pyo) {
  throw "Nuitka output still contains Python source or bytecode"
}
Remove-Item -LiteralPath $work -Recurse -Force
Remove-Item -LiteralPath $src -Recurse -Force
Write-Output "Nuitka backend ready: $output"
