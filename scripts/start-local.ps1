param(
    [ValidateSet('MySQL', 'H2')][string]$Database = 'MySQL',
    [switch]$FrontendOnly,
    [ValidateRange(1024, 65535)][int]$BackendPort = 8080,
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$NodeHome = 'D:\config\node.js',
    [string]$MySqlDirectory = 'D:\config\miniapp-mysql'
)
$ErrorActionPreference = 'Stop'
$frontendRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$nodeCommand = Join-Path $NodeHome 'node.exe'
if (-not (Test-Path -LiteralPath $nodeCommand)) {
    $nodeOnPath = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeOnPath) { throw '请通过 -NodeHome 指定 Node 安装目录。' }
    $nodeCommand = $nodeOnPath.Source
}
if (-not $JavaHome -and (Test-Path -LiteralPath 'D:\IntelliJ IDEA 2026.3\jbr')) { $JavaHome = 'D:\IntelliJ IDEA 2026.3\jbr' }
if ($JavaHome) { $env:JAVA_HOME = $JavaHome }
$env:VITE_PROXY_TARGET = "http://127.0.0.1:$BackendPort"
# H5 与管理端都走同源代理，避免微信调试终端遗留的直连地址造成跨域。
$env:VITE_API_BASE_URL = ''
$env:SERVER_PORT = [string]$BackendPort
if ($Database -eq 'MySQL') {
    # mysql profile 不注册共享开发登录，H5 只展示真实可用的登录入口。
    $env:VITE_ENABLE_DEV_LOGIN = 'false'
    if (-not $FrontendOnly) {
        $env:MINIAPP_MYSQL_DIR = $MySqlDirectory
        & $nodeCommand (Join-Path $PSScriptRoot 'mysql-local.mjs') start
        if ($LASTEXITCODE -ne 0) { throw '项目 MySQL 启动失败。' }
        $credentials = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $MySqlDirectory 'credentials.json') | ConvertFrom-Json
        $env:SPRING_PROFILES_ACTIVE = 'mysql,docs'
        $env:DB_URL = "jdbc:mysql://$($credentials.host):$($credentials.port)/$($credentials.database)?useUnicode=true&characterEncoding=UTF-8&connectionTimeZone=UTC&allowPublicKeyRetrieval=true&sslMode=DISABLED"
        $env:DB_USERNAME = $credentials.username
        $env:DB_PASSWORD = $credentials.password
        $env:ADMIN_USERNAME = $credentials.adminUsername
        $env:ADMIN_PASSWORD = $credentials.adminPassword
        $env:MEDIA_DIRECTORY = Join-Path $MySqlDirectory 'uploads'
    }
} else {
    $env:SPRING_PROFILES_ACTIVE = 'local'
    $env:VITE_ENABLE_DEV_LOGIN = 'true'
    if (-not $FrontendOnly) {
        if (-not $env:ADMIN_USERNAME) { $env:ADMIN_USERNAME = 'admin' }
        if (-not $env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD = 'miniapp123' }
    }
}
Push-Location $frontendRoot
try {
    $arguments = @('scripts/dev.mjs')
    if ($FrontendOnly) { $arguments += '--frontend-only' }
    & $nodeCommand @arguments
    exit $LASTEXITCODE
} finally {
    Pop-Location
    Remove-Item Env:DB_PASSWORD, Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
}
