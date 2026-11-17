param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$NodeHome = 'D:\config\node.js'
)
$ErrorActionPreference = 'Stop'
$frontendRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $JavaHome -and (Test-Path -LiteralPath 'D:\IntelliJ IDEA 2026.3\jbr')) { $JavaHome = 'D:\IntelliJ IDEA 2026.3\jbr' }
if ($JavaHome) { $env:JAVA_HOME = $JavaHome }
$nodeCommand = Join-Path $NodeHome 'node.exe'
if (-not (Test-Path -LiteralPath $nodeCommand)) {
    $nodeOnPath = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeOnPath) { throw '请通过 -NodeHome 指定 Node 安装目录。' }
    $nodeCommand = $nodeOnPath.Source
}
if (-not $env:ADMIN_USERNAME) { $env:ADMIN_USERNAME = 'admin' }
if (-not $env:ADMIN_PASSWORD) {
    $securePassword = Read-Host '管理密码（至少 12 位，仅首次初始化时写入数据库）' -AsSecureString
    $env:ADMIN_PASSWORD = [Net.NetworkCredential]::new('', $securePassword).Password
}
Push-Location $frontendRoot
try { & $nodeCommand 'scripts/dev.mjs'; exit $LASTEXITCODE }
finally { Pop-Location; Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue }
