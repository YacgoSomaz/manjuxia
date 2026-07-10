[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ReleaseDir
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path -LiteralPath $ReleaseDir).Path
$blockedExtensions = @(".py", ".pyc", ".pyo", ".log", ".db", ".sqlite", ".sqlite3", ".cookie", ".env", ".map", ".md", ".tmp", ".bak")
$blockedNames = @("backend.session", "cookies", "cookie", "release.local.json", "readme", "readme.md", ".env")
$violations = [System.Collections.Generic.List[string]]::new()

Get-ChildItem -LiteralPath $root -Recurse -File -Force | ForEach-Object {
  $relative = $_.FullName.Substring($root.Length).TrimStart([char[]]"\\/")
  if ($blockedExtensions -contains $_.Extension.ToLowerInvariant()) {
    $violations.Add("blocked extension: $relative")
  }
  if ($blockedNames -contains $_.Name.ToLowerInvariant()) {
    $violations.Add("blocked name: $relative")
  }
  if ($relative -match "(^|[\\/])(data|logs?|temp|tmp|test-artifacts|src|prompts?|docs?|backend)([\\/]|$)") {
    $violations.Add("runtime directory: $relative")
  }
}

$manifest = Join-Path $root "integrity_manifest.json"
if (-not (Test-Path -LiteralPath $manifest)) {
  $violations.Add("missing integrity_manifest.json")
}

if ($violations.Count -gt 0) {
  $violations | ForEach-Object { Write-Error $_ }
  throw "release scan failed with $($violations.Count) violation(s)"
}

Write-Output "release scan passed: $root"
