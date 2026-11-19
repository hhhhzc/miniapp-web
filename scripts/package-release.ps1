param(
    [switch]$IncludeDemo,
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$MavenHome = 'D:\IntelliJ IDEA 2026.3\plugins\maven-plugin\lib\maven3',
    [string]$NodeHome = 'D:\config\node.js',
    [string]$BackendDirectory = ''
)
$ErrorActionPreference = 'Stop'
$frontendRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $BackendDirectory) { $BackendDirectory = Join-Path (Split-Path $frontendRoot -Parent) 'miniapp-app' }
$BackendDirectory = [IO.Path]::GetFullPath($BackendDirectory)
if (-not $JavaHome -and (Test-Path -LiteralPath 'D:\IntelliJ IDEA 2026.3\jbr')) { $JavaHome = 'D:\IntelliJ IDEA 2026.3\jbr' }
if ($JavaHome) { $env:JAVA_HOME = $JavaHome }
$nodeCommand = Join-Path $NodeHome 'node.exe'
$mavenCommand = Join-Path $MavenHome 'bin\mvn.cmd'
if (-not (Test-Path -LiteralPath $nodeCommand)) { throw '未找到 Node，请设置 -NodeHome。' }
if (-not (Test-Path -LiteralPath $mavenCommand)) { throw '未找到 Maven，请设置 -MavenHome。' }

# 使用独立构建目录，避免 Windows 上正在运行的 app.jar 被覆盖或占用。
$releaseId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$buildRoot = Join-Path $frontendRoot ".cache\release-build-$releaseId"
$backendCopy = Join-Path $buildRoot 'backend'
$output = Join-Path $frontendRoot "dist\releases\miniapp-$releaseId"
[IO.Directory]::CreateDirectory($backendCopy) | Out-Null
[IO.Directory]::CreateDirectory($output) | Out-Null
Copy-Item -LiteralPath (Join-Path $BackendDirectory 'pom.xml') -Destination $backendCopy
foreach ($module in @('api', 'app', 'domain', 'infrastructure', 'trigger', 'types')) {
    $target = Join-Path $backendCopy $module
    [IO.Directory]::CreateDirectory($target) | Out-Null
    Copy-Item -LiteralPath (Join-Path $BackendDirectory "$module\pom.xml") -Destination $target
    $source = Join-Path $BackendDirectory "$module\src"
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $target -Recurse }
}
$repositoryCache = Join-Path $BackendDirectory '.cache\m2'
Push-Location $backendCopy
try {
    & $mavenCommand --batch-mode --no-transfer-progress "-Dmaven.repo.local=$repositoryCache" package
    if ($LASTEXITCODE -ne 0) { throw '后端构建或测试失败，未生成上线包。' }
} finally { Pop-Location }
Push-Location $frontendRoot
try {
    & $nodeCommand 'node_modules\vite\bin\vite.js' build --config admin-web/vite.config.js
    if ($LASTEXITCODE -ne 0) { throw '管理后台构建失败。' }
} finally { Pop-Location }

Copy-Item -LiteralPath (Join-Path $backendCopy 'app\target\app.jar') -Destination (Join-Path $output 'app.jar')
Copy-Item -LiteralPath (Join-Path $frontendRoot 'dist\admin') -Destination $output -Recurse
Copy-Item -LiteralPath (Join-Path $frontendRoot 'deploy\compose.yaml') -Destination $output
Copy-Item -LiteralPath (Join-Path $frontendRoot 'deploy\server.env.example') -Destination (Join-Path $output '.env.example')
Copy-Item -LiteralPath (Join-Path $frontendRoot 'deploy\nginx-http.conf.example') -Destination $output
Copy-Item -LiteralPath (Join-Path $frontendRoot 'deploy\nginx.conf.example') -Destination $output
Copy-Item -LiteralPath (Join-Path $frontendRoot 'docs\deployment-and-debugging.md') -Destination (Join-Path $output 'README.md')
Copy-Item -LiteralPath (Join-Path $frontendRoot 'docs\activity-navigation.md') -Destination $output
$sqlRoot = Join-Path $output 'sql'
$optionalRoot = Join-Path $output 'optional'
[IO.Directory]::CreateDirectory($sqlRoot) | Out-Null
[IO.Directory]::CreateDirectory($optionalRoot) | Out-Null
$databaseSource = Join-Path $BackendDirectory 'app\src\main\resources\db'
Copy-Item -LiteralPath (Join-Path $frontendRoot 'deploy\create-database.sql') -Destination (Join-Path $sqlRoot '000-create-database.sql')
Copy-Item -LiteralPath (Join-Path $databaseSource 'schema.sql') -Destination (Join-Path $sqlRoot '001-schema.sql')
Copy-Item -LiteralPath (Join-Path $frontendRoot 'deploy\runtime-permissions.sql') -Destination (Join-Path $sqlRoot '004-runtime-permissions.sql')
Copy-Item -LiteralPath (Join-Path $databaseSource 'demo-data.sql') -Destination $optionalRoot
Copy-Item -LiteralPath (Join-Path $databaseSource 'migrations\20261119_entry_activity.sql') -Destination $optionalRoot
if ($IncludeDemo) { Copy-Item -LiteralPath (Join-Path $databaseSource 'demo-data.sql') -Destination (Join-Path $sqlRoot '003-demo-data.sql') }
$hashes = Get-ChildItem -LiteralPath $output -File -Recurse | ForEach-Object {
    $relative = $_.FullName.Substring($output.Length + 1).Replace('\', '/')
    [PSCustomObject]@{ path = $relative; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
[IO.File]::WriteAllText((Join-Path $output 'checksums.json'), (ConvertTo-Json -InputObject @($hashes) -Depth 4), [Text.UTF8Encoding]::new($false))
$archive = "$output.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($output, $archive)
Write-Output "上线目录：$output"
Write-Output "上线压缩包：$archive"
Write-Output 'SQL 来自本次后端源码；未打包本地数据库、凭据或生产环境文件。'
