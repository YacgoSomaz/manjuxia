[CmdletBinding()]
param()

$experimentRoot = Split-Path -Parent $PSCommandPath
$repositoryRoot = Split-Path -Parent $experimentRoot
$labData = Join-Path $env:APPDATA '万山青山实验中\data'
$labProfile = Join-Path $env:APPDATA '万山青山实验中\electron-profile'

if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot 'package.json'))) {
    throw "未找到实验分支的仓库根目录: $repositoryRoot"
}

New-Item -ItemType Directory -Force -Path $labData, $labProfile | Out-Null

# 该启动入口只加载千山实验页，且页面会锁定为 qianshan_direct。
$env:WANSHAN_ENABLE_QIANSHAN_LAB = '1'
$env:WANSHAN_LAUNCH_QIANSHAN_LAB = '1'
$env:WANSHAN_QINGSHAN_EXPERIMENT = '1'
$env:WANSHAN_APP_NAME = '万山青山实验中'
$env:WANSHAN_DATA_DIR = $labData
$env:WANSHAN_BACKEND_PORT_FILE = Join-Path $labData 'backend.port'
$env:WANSHAN_SESSION_SECRET_FILE = Join-Path $labData 'backend.session'

Push-Location $repositoryRoot
try {
    & npm.cmd start -- "--user-data-dir=$labProfile"
} finally {
    Pop-Location
}
