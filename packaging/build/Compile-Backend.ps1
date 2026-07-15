[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)] [string]$ReleaseDir,
  [string]$Python = "python",
  [switch]$DisableBackendCache
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$release = (Resolve-Path -LiteralPath $ReleaseDir).Path
$work = Join-Path $release ".nuitka-build"
$src = Join-Path $release ".nuitka-src"
$backendRoot = Join-Path $release "backend-dist"
$output = Join-Path $backendRoot "backend-server"
$dataFile = Join-Path $projectRoot "backend/data/wanshan_prompt_seed.json"
$modelFile = Join-Path $projectRoot "backend/ml_models/face_detection_yunet_2023mar.onnx"
$requirementsFile = Join-Path $projectRoot "backend/requirements.txt"

function Get-Sha256Text([string]$Text) {
  $hasher = [Security.Cryptography.SHA256]::Create()
  try {
    $hash = $hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text))
    return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
  }
  finally {
    $hasher.Dispose()
  }
}

function Get-BackendSourceFingerprint {
  $tracked = @(
    "backend/main.py", "backend/_version.py", "backend/requirements.txt", "backend/data/wanshan_prompt_seed.json",
    "backend/ml_models/face_detection_yunet_2023mar.onnx", "backend/api", "backend/database",
    "backend/models", "backend/services", "backend/tools", "backend/utils", "backend/ml_models",
    "packaging/build/Compile-Backend.ps1"
  )
  $entries = [System.Collections.Generic.List[string]]::new()
  $entries.Add("wanshan.backend-cache.v1")
  $runtime = (& $Python -c "import sys, importlib.metadata; print(sys.version.split()[0] + '|Nuitka=' + importlib.metadata.version('Nuitka'))") -join ""
  if ($LASTEXITCODE -ne 0) { throw "unable to identify the Nuitka build runtime" }
  $entries.Add($runtime)
  $installedPackages = (& $Python -m pip freeze | Sort-Object) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "unable to identify the Python build dependencies" }
  $entries.Add($installedPackages)
  $entries.Add("--standalone|backend-server.exe|onnx,prompt-seed")
  foreach ($relative in $tracked) {
    $candidate = Join-Path $projectRoot $relative
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    $files = if (Test-Path -LiteralPath $candidate -PathType Container) {
      Get-ChildItem -LiteralPath $candidate -Recurse -File | Where-Object { $_.FullName -notmatch "__pycache__" }
    } else {
      Get-Item -LiteralPath $candidate
    }
    foreach ($file in ($files | Sort-Object FullName)) {
      $pathFromRoot = $file.FullName.Substring($projectRoot.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
      $fileHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      $entries.Add("$pathFromRoot|$fileHash|$($file.Length)")
    }
  }
  return Get-Sha256Text ($entries -join "`n")
}

function Get-BackendTreeManifest([string]$Root) {
  return @(Get-ChildItem -LiteralPath $Root -Recurse -File | Sort-Object FullName | ForEach-Object {
    [ordered]@{
      path = $_.FullName.Substring($Root.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
      bytes = $_.Length
      sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  })
}

function Test-BackendCache([string]$CacheDir, [string]$Fingerprint) {
  $metadataPath = Join-Path $CacheDir "metadata.json"
  $cachedDist = Join-Path $CacheDir "backend-dist"
  if (-not (Test-Path -LiteralPath $metadataPath) -or -not (Test-Path -LiteralPath $cachedDist)) { return $false }
  try {
    $metadata = Get-Content -LiteralPath $metadataPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($metadata.schema -ne "wanshan.backend-cache.v1" -or $metadata.fingerprint -ne $Fingerprint) { return $false }
    $actual = @(Get-BackendTreeManifest $cachedDist)
    $expected = @($metadata.files)
    if ($actual.Count -eq 0 -or $actual.Count -ne $expected.Count) { return $false }
    for ($index = 0; $index -lt $actual.Count; $index++) {
      if ($actual[$index].path -ne $expected[$index].path -or $actual[$index].bytes -ne $expected[$index].bytes -or $actual[$index].sha256 -ne $expected[$index].sha256) { return $false }
    }
    return $true
  }
  catch {
    return $false
  }
}

function Save-BackendCache([string]$CacheRoot, [string]$Fingerprint, [string]$CompiledDist) {
  $cacheDir = Join-Path $CacheRoot $Fingerprint
  $temporary = "$cacheDir.tmp-$PID"
  if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Recurse -Force }
  New-Item -ItemType Directory -Path (Join-Path $temporary "backend-dist") -Force | Out-Null
  Copy-Item -Path (Join-Path $CompiledDist "*") -Destination (Join-Path $temporary "backend-dist") -Recurse -Force
  $metadata = [ordered]@{
    schema = "wanshan.backend-cache.v1"
    fingerprint = $Fingerprint
    created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    files = @(Get-BackendTreeManifest (Join-Path $temporary "backend-dist"))
  }
  $metadata | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $temporary "metadata.json") -Encoding UTF8
  if (Test-Path -LiteralPath $cacheDir) { Remove-Item -LiteralPath $cacheDir -Recurse -Force }
  Move-Item -LiteralPath $temporary -Destination $cacheDir
}

if (-not (Test-Path -LiteralPath $dataFile)) { throw "backend prompt seed missing: $dataFile" }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "backend/main.py"))) { throw "backend/main.py missing" }
if (-not (Test-Path -LiteralPath $requirementsFile)) { throw "backend requirements missing: $requirementsFile" }

# Always synchronize the pinned build environment before calculating the cache
# fingerprint. A cached Nuitka tree is only valid when its Python dependencies
# are complete as well as when its source files match.
& $Python -m pip install --disable-pip-version-check -r $requirementsFile | Out-Host
if ($LASTEXITCODE -ne 0) { throw "failed to install backend build dependencies" }
& $Python -c "import docx, openpyxl; print('backend runtime imports ready')" | Out-Host
if ($LASTEXITCODE -ne 0) { throw "backend build environment is missing required runtime imports" }

if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
if (Test-Path -LiteralPath $src) { Remove-Item -LiteralPath $src -Recurse -Force }
if (Test-Path -LiteralPath $backendRoot) { Remove-Item -LiteralPath $backendRoot -Recurse -Force }
New-Item -ItemType Directory -Path $work,$src,$output -Force | Out-Null

$cacheRoot = Join-Path $env:LOCALAPPDATA "万山/build-cache/backend"
$cacheFingerprint = Get-BackendSourceFingerprint
$cacheDir = Join-Path $cacheRoot $cacheFingerprint
if (-not $DisableBackendCache -and (Test-BackendCache $cacheDir $cacheFingerprint)) {
  Copy-Item -Path (Join-Path $cacheDir "backend-dist\*") -Destination $output -Recurse -Force
  if (-not (Test-Path -LiteralPath (Join-Path $output "backend-server.exe"))) {
    throw "validated backend cache is missing backend-server.exe"
  }
  Write-Output "Nuitka backend cache hit: $cacheFingerprint"
  Remove-Item -LiteralPath $work -Recurse -Force
  Remove-Item -LiteralPath $src -Recurse -Force
  return
}
if ($DisableBackendCache) {
  Write-Output "Nuitka backend cache disabled; running a full compile."
} else {
  Write-Output "Nuitka backend cache miss; running a full compile."
}

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

$embeddedSeedModule = Join-Path $src "services/wanshan_prompt_seed_embedded.py"
$embedSeedScript = Join-Path $src "_embed_prompt_seed.py"
@"
import base64
import json
import pathlib
import sys
import zlib

payload = base64.b64encode(zlib.compress(pathlib.Path(sys.argv[1]).read_bytes(), 9)).decode("ascii")
source = """# Generated only in the temporary Nuitka source tree.\nimport base64\nimport json\nimport zlib\n\n_PAYLOAD = {payload!r}\n\ndef load_templates():\n    return json.loads(zlib.decompress(base64.b64decode(_PAYLOAD)).decode(\"utf-8\"))\n""".format(payload=payload)
pathlib.Path(sys.argv[2]).write_text(source, encoding="utf-8")
"@ | Set-Content -LiteralPath $embedSeedScript -Encoding UTF8
& $Python $embedSeedScript $dataFile $embeddedSeedModule
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $embeddedSeedModule)) {
  throw "failed to embed bundled prompt seed"
}
Remove-Item -LiteralPath $embedSeedScript -Force

# ``nuitka --version`` triggers a compiler probe on some Windows hosts and can
# block before the actual build begins. Importing the module proves the pinned
# build interpreter is ready without touching the compiler toolchain twice.
& $Python -c "import nuitka; print('Nuitka ready')" | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Nuitka is not available through $Python -m nuitka" }

$args = @(
  "-m", "nuitka",
  "--standalone",
  "--assume-yes-for-downloads",
  "--output-dir=$work",
  "--output-filename=backend-server.exe",
  (Join-Path $src "main.py")
)
if (Test-Path -LiteralPath $modelFile) {
  $args = $args[0..($args.Count - 2)] + "--include-data-file=$modelFile=ml_models/face_detection_yunet_2023mar.onnx" + $args[-1]
}
$args = $args[0..($args.Count - 2)] + "--include-module=services.wanshan_prompt_seed_embedded" + $args[-1]
$args = $args[0..($args.Count - 2)] + "--include-package=openpyxl" + $args[-1]
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
$sourceLeak = Get-ChildItem -LiteralPath $output -Recurse -File |
  Where-Object { $_.Extension -in ".py", ".pyc", ".pyo" }
if ($sourceLeak) {
  throw "Nuitka output still contains Python source or bytecode"
}
if (-not $DisableBackendCache) {
  New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
  Save-BackendCache $cacheRoot $cacheFingerprint $output
  Write-Output "Nuitka backend cache saved: $cacheFingerprint"
}
Remove-Item -LiteralPath $work -Recurse -Force
Remove-Item -LiteralPath $src -Recurse -Force
Write-Output "Nuitka backend ready: $output"
