[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ReleaseDir,
  [string[]]$KeepLocales = @("zh-CN", "en-US")
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath $ReleaseDir).Path

$backendDist = Join-Path $root "resources/backend-dist"
if (-not (Test-Path -LiteralPath $backendDist)) {
  $backendDist = Join-Path $root "backend-dist"
}

if (Test-Path -LiteralPath $backendDist) {
  @("scipy", "scipy.libs", "pandas", "pandas.libs") | ForEach-Object {
    $candidate = Join-Path $backendDist $_
    if (Test-Path -LiteralPath $candidate) {
      Remove-Item -LiteralPath $candidate -Recurse -Force
      Write-Output "removed optional runtime directory: $candidate"
    }
  }
}

$localesDir = Join-Path $root "locales"
if (Test-Path -LiteralPath $localesDir) {
  Get-ChildItem -LiteralPath $localesDir -File -Filter "*.pak" | Where-Object {
    $KeepLocales -notcontains $_.BaseName
  } | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
    Write-Output "removed locale: $($_.Name)"
  }
}

Write-Output "release prune complete: $root"
