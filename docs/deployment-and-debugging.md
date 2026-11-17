# 券小站：数据库、本地联调与上线操作手册

适用项目：前端 `D:\IDEA work\miniapp-web`，后端 `D:\IDEA work\miniapp-app`。

本文按“先本地验证，再准备一台 Ubuntu 24.04 服务器上线”的顺序操作。服务器尚未准备，服务器部分是待执行步骤；本地安装结果见下表。

## 1. 本机现在的实际情况

| 项目 | 当前配置 |
| --- | --- |
| 已有 MySQL 程序 | `D:\MySQL`，版本 **8.4.11**，Oracle 签名有效 |
| 原有数据 | `D:\MySQL\data`，本次未修改 |
| 本项目独立实例 | `D:\config\miniapp-mysql` |
| 连接地址 | `127.0.0.1:3307`，仅监听本机 |
| 数据库 | `miniapp`（原库已精简为三张表），utf8mb4 字符集，UTC 时间 |
| 已初始化内容 | 3 张表：app_user、nav_module、nav_entry；保留 4 个模块、16 个展示入口 |
| 应用数据库用户 | `miniapp`，只有项目库的 SELECT / INSERT / UPDATE / DELETE 权限 |
| 后台管理员 | 服务端配置的单个账号，不建管理员表；后端重启后需重新登录 |
| 本地私有凭据 | `D:\config\miniapp-mysql\credentials.json`，仅当前 Windows 用户可访问 |

本机已有 MySQL，因此本次复用现有程序，另外创建项目数据目录，没有重复安装，也没有重置原数据库的 root 密码。当前用户没有 Windows 管理员权限，因此项目实例按需后台运行，**没有注册开机自启服务**。重启电脑后按下一节启动即可。

### 三种账号不要混用

- `root`：管理本项目 MySQL 实例及导入建表脚本，密码见私有文件的 `rootPassword`。
- `miniapp`：Java 连接数据库的账号，密码见 `password`。
- 网页后台账号：`admin` / `miniapp123`；登录 `/admin/` 使用这组账号。

按本次要求，本机 MySQL root、应用数据库账号 miniapp，以及网页管理员 admin 的密码均为 `miniapp123`。三表版直接使用原来的 `miniapp` 库，迁移后临时库已移除。改动前已完整备份两个库，备份位于 `D:\config\miniapp-mysql\backups`。本机私有连接文件和 IDEA 环境变量文件均已同步。

## 2. 启动与停止本地 MySQL

在前端目录的 PowerShell 执行：

```powershell
cd 'D:\IDEA work\miniapp-web'
& 'D:\config\node.js\node.exe' scripts/mysql-local.mjs status
& 'D:\config\node.js\node.exe' scripts/mysql-local.mjs start
```

正常输出应包含 MySQL 版本和 `127.0.0.1:3307`。停止数据库：

```powershell
& 'D:\config\node.js\node.exe' scripts/mysql-local.mjs stop
```

停止保留所有数据。配置是 `D:\config\miniapp-mysql\my.ini`，数据在 `data`，日志在 `logs/mysql-error.log`。不要重新初始化已有数据目录。

### 使用 Navicat 连接

新建 MySQL 连接，地址填写 `127.0.0.1`，端口 **3307**，用户名 `miniapp`，密码取私有文件的 `password`（当前为 `miniapp123`），数据库选择 `miniapp`。

查看、修改业务数据可用应用账号；建表和更改表结构使用该独立实例的 `root` 账号。这里的 root 密码属于新项目实例，不能用于原来 `3306` 的数据库。

## 3. 本地联调方式 A：一次启动前后端

### 3.1 先构建后端

后端修改 Java 后要重新构建，或者改用下一节的 IDEA Debug。运行中的旧 Jar 可能导致 Windows 无法覆盖产物，先停止对应旧进程。

```powershell
cd 'D:\IDEA work\miniapp-app'
powershell -NoProfile -ExecutionPolicy Bypass -File .\dev.ps1 -Action Build -JavaHome 'D:\IntelliJ IDEA 2026.3\jbr' -MavenHome 'D:\IntelliJ IDEA 2026.3\plugins\maven-plugin\lib\maven3'
```

### 3.2 使用 MySQL 启动

```powershell
cd 'D:\IDEA work\miniapp-web'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Database MySQL
```

脚本自动启动本项目 MySQL，读取本机私有凭据，设置后端 `mysql,docs` profile，并启动两个前端服务。

| 页面 / 服务 | 地址 |
| --- | --- |
| 小程序 H5 预览 | `http://127.0.0.1:5173/` |
| 网页配置后台 | `http://127.0.0.1:5174/admin/` |
| 本地后端 | `http://127.0.0.1:8080` |
| MySQL | `127.0.0.1:3307` |

如果已有后端占用 8080，可以明确换一个端口，两个前端代理会一起调整：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Database MySQL -BackendPort 8081
```

Ctrl+C 停止本次启动的 Java 和前端服务；MySQL 独立保留运行。切换数据库不会迁移另一套数据库的数据。

### 3.3 仍然可以用原 H2 模式

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Database H2
```

H2 使用后端工作目录中的 `data/miniapp-simple.mv.db`；MySQL 使用本项目的独立实例。H2 的 `local` profile 支持开发体验登录；`mysql` profile 不注册共享体验登录接口。

## 4. 本地联调方式 B：IDEA Debug 后端，单独运行前端

这是修改 Java、打断点时推荐的方式。

1. 在 IDEA 打开 `miniapp-app/pom.xml`，使用 Java 21+，启动类是 `miniapp.MiniappApplication`。
2. 打开 Run → Edit Configurations，选择应用配置，工作目录设为 `D:\IDEA work\miniapp-app`。
3. 将本机生成的 `D:\config\miniapp-mysql\idea-environment.txt` 内容粘贴到 **Environment variables** 输入框。它是一行分号分隔的配置，包含数据库和后台管理员所需的私有值。不要把这行内容提交到仓库。
4. 如果已有服务占用 8080，先停止旧服务，或者把该运行配置里的 `SERVER_PORT` 改为 8081。
5. 先运行 `node scripts/mysql-local.mjs start`，再在 IDEA 点击 Debug。
6. 前端目录运行以下命令，**不再重复启动 Java**：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -FrontendOnly -Database MySQL -BackendPort 8080
```

IDEA 后端若是 8081，上面的 `BackendPort` 也填 8081。

H5 和管理端都由 Vite 把 `/api/`、`/media/` 代理到本地后端，页面无需直接跨域请求 Java。手动运行 `npm run dev:h5` / `npm run dev:admin` 时，默认代理 8080；可在当前终端设置 `VITE_PROXY_TARGET=http://127.0.0.1:8081` 调整。

### 本地连通检查

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/api/v1/system/health'
Invoke-RestMethod 'http://127.0.0.1:8080/api/v1/home'
```

健康状态应为 `UP`，首页应返回模块数组。再登录管理后台修改一个入口说明，刷新 H5 首页，并在 Navicat 检查 `nav_entry`，确认“后台 → 数据库 → 小程序页面”的闭环。

## 5. 微信开发者工具和手机调试

H5 能验证布局、搜索、后台管理、数据库读写；**微信真实登录与打开其他小程序要在微信环境验证**。

1. `src/manifest.json` 的 `mp-weixin.appid` 填自己的微信小程序 AppID。
2. 后端设置 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`，AppSecret 只留在后端。
3. 微信开发者工具模拟器在单独终端设置 `VITE_API_BASE_URL` 指向本地后端。MySQL 启动脚本隐藏开发体验按钮，使用下面的构建命令配置地址最明确。
4. 编译微信端：

```powershell
$env:Path = 'D:\config\node.js;' + $env:Path
$env:VITE_API_BASE_URL = 'http://127.0.0.1:8080'
npm run dev:mp-weixin
```

5. 在开发者工具导入 `dist/dev/mp-weixin`。本地 HTTP 联调时可在开发工具中临时关闭合法域名校验；发布前恢复，并配置真实 HTTPS 合法域名。
6. 手机访问不了电脑的 `127.0.0.1`。真机联调要用电脑的局域网 IP，手机与电脑处于同一网络；后端将 `SERVER_ADDRESS` 改为 `0.0.0.0`，仅在所需局域网范围允许后端端口，前端填 `http://电脑IP:后端端口`。

微信调试终端的地址只作用于该终端；H5 使用另一个终端及同源代理，不需要给后端额外开放跨域。

### 生产构建前清理本地配置的影响

生产 `VITE_API_BASE_URL` 必须是服务器 HTTPS 域名。在独立终端构建小程序，避免本地临时环境变量优先覆盖生产配置。上传的目录是 `dist/build/mp-weixin`，不是 dev 目录。

## 6. 三张表与数据库脚本

| 表 | 用途 | 核心字段 |
| --- | --- | --- |
| app_user | 微信登录用户 | id、open_id、display_name、token_hash、token_expires_at、created_at |
| nav_module | 首页模块，后台可增删 | id、title、layout、sort_order、enabled |
| nav_entry | 模块里的图片与跳转入口 | id、module_id、title、image_url、app_id、target_path、sort_order、enabled |

三表主键统一为自增 INT，module_id 也是 INT；openid 是微信身份字符串，不是加密后的主键。用户只保存当前登录凭证的 SHA256 摘要，重新登录使上次凭证失效，有效期 7 天。网页管理员单账号由 ADMIN_USERNAME / ADMIN_PASSWORD 配置，管理会话保留 8 小时并放在内存，重启后重新登录。

正式建表只执行后端 app/src/main/resources/db/schema.sql，无需其他建表脚本。它包含中文字段注释。旧的订单、推广、优惠活动、管理员和独立会话表不再参与本版。

| 上线包路径 | 用途 |
| --- | --- |
| sql/000-create-database.sql | 新建服务器 miniapp 数据库 |
| sql/001-schema.sql | 创建上述三张表 |
| sql/003-demo-data.sql | 仅打包时指定 -IncludeDemo 才自动导入展示示例 |
| sql/004-runtime-permissions.sql | 限制 Docker 中应用账号的运行权限 |
| optional/demo-data.sql | 新库可选的展示内容，手动导入一次，不在每次启动时重复加载 |

新服务器使用 000 → 001，再按需导入示例。旧版 VARCHAR 主键库不能直接执行 CREATE TABLE IF NOT EXISTS 来升级；本机已在原 miniapp 库完成替换：保留三表版的模块和入口内容、删除旧版多余表，原始十表内容可从本机 SQL 备份回查。服务器尚未部署，直接使用新包的三表脚本即可。

### Swagger 在线接口调试

后端启动后打开 **http://127.0.0.1:8080/swagger-ui/index.html**，OpenAPI JSON 为 /v3/api-docs；端口改成 8081 时地址同步修改。

1. H2 的 local 配置自动启用；本地 MySQL 使用 mysql,docs，启动脚本及本机 idea-environment.txt 已配置好。
2. 展开 GET /api/v1/home，点 Try it out → Execute，直接查看真实首页响应。
3. 调管理接口时，先 POST /api/v1/admin/auth/login，填写管理员账号密码。
4. 复制响应里的 data.token，点页面右上的 Authorize，填入原始 Token，系统自动加 Bearer 前缀。随后可调模块、入口、上传和删除接口。
5. 微信登录用小程序 wx.login 得到的临时 code 调 POST /api/v1/auth/wechat-login；不能直接填写 openid。登录结果的用户 Token 只能访问用户接口，不具备管理权限。

生产只启用 mysql，Swagger 默认关闭。文档依据：[springdoc 官方说明](https://springdoc.org/getting-started.html)。

## 7. 生成可以上传的上线包

在前端目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-release.ps1
```

如果希望新库自动带上 4 个展示模块和 16 个入口：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-release.ps1 -IncludeDemo
```

脚本在独立临时目录构建后端并运行测试，不覆盖正在运行的原 app.jar；同时构建管理端。最终目录和 ZIP 在 `dist/releases/`，包括：

```text
miniapp-时间戳/
  app.jar
  admin/                         管理后台静态产物
  compose.yaml                   MySQL + Java
  .env.example                   服务器参数模板，密码按约定统一设置
  sql/                           按序执行的初始化脚本
  optional/                      可选展示种子
  nginx-http.conf.example         首次配置域名和 HTTPS 用
  nginx.conf.example              已有证书时的 HTTPS 示例
  checksums.json                 包内文件 SHA256
  README.md                      本操作手册
```

源码、node_modules、本机数据库和私有凭据不进入上线包。微信小程序是单独构建、上传微信后台的，不部署在这个服务器 ZIP 里。

## 8. 准备服务器

一期可先按 **2 核 CPU、4GB 内存、40GB 及以上磁盘**规划，这是小规模单机的资源建议，不代表固定并发能力。选择 Ubuntu 24.04 64 位系统，准备一个指向服务器公网 IP 的 API 域名。

云安全组开放网站的 80/443，SSH 仅允许你使用的来源访问。MySQL 不映射公网端口，Java 只通过宿主机 `127.0.0.1:8080` 给 Nginx 访问。

在新的 Ubuntu 服务器上按 Docker 官方仓库安装：

```bash
sudo apt update
sudo apt install -y ca-certificates curl nginx certbot python3-certbot-nginx unzip
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker nginx
sudo docker compose version
```

以上针对新 Ubuntu 24.04；若服务器已有其他业务或使用宝塔，先确认软件与端口再适配，不重复套用安装步骤。服务器不必另装 Java 或 Node，Java 使用官方 Temurin 21 JRE 镜像，本地已经构建好网页静态文件。

## 9. 上传并启动 MySQL / Java

把 ZIP 上传到服务器并解压，目录内容放在 `/opt/miniapp`。以下命令由你在服务器操作：

```bash
sudo mkdir -p /opt/miniapp /var/www/miniapp/admin
# 将解压后的 app.jar、compose.yaml、sql、admin 等内容复制到 /opt/miniapp
cd /opt/miniapp
sudo cp .env.example .env
sudo chmod 600 .env
sudo nano .env
```

`.env.example` 已按当前约定将 MySQL root、应用数据库和网页管理员密码统一为 `miniapp123`。复制后确认这三项一致。填入真实微信 AppID/AppSecret；暂时未填时可联调首页和后台，真实微信登录会提示缺少配置。

环境含义：

| 字段 | 含义 |
| --- | --- |
| `MYSQL_ROOT_PASSWORD` | 容器数据库的管理密码 |
| `DB_PASSWORD` | 镜像创建 miniapp 用户和 Java 连接使用的同一密码 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 网页后台账号配置，密码至少 8 位，修改后重启生效 |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 自己的小程序后端凭据 |

```bash
sudo docker compose config --quiet
sudo docker compose pull
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs --tail=100 app
curl -fsS http://127.0.0.1:8080/api/v1/system/health
curl -fsS http://127.0.0.1:8080/api/v1/home
```

首次启动 MySQL 对空数据卷创建 miniapp 库、账号，并按文件名顺序执行 `sql/`；Java 等 MySQL 健康后启动。**已有数据卷时不会重新执行初始化脚本，也不会因修改 .env 自动修改已有数据库密码。** 修改账号密码要同时更新数据库与对应配置。

Java 容器内部监听 `0.0.0.0`，但映射到宿主机的地址仍是 `127.0.0.1:8080`。数据库通过 Docker 内部服务名 `db:3306` 连接；这不是本机开发使用的 `127.0.0.1:3307`。

如果报表不存在，检查 MySQL 首次初始化日志及当前数据卷，先确认脚本是否已经执行；不要为了重跑初始化直接删除数据卷。

## 10. 部署管理后台、域名和 HTTPS

```bash
cd /opt/miniapp
sudo cp -a admin/. /var/www/miniapp/admin/
sudo cp nginx-http.conf.example /etc/nginx/sites-available/miniapp
sudo nano /etc/nginx/sites-available/miniapp
```

把 `miniapp.example.com` 替换为自己的实际域名，并确认域名 A 记录已指向服务器。

```bash
sudo ln -s /etc/nginx/sites-available/miniapp /etc/nginx/sites-enabled/miniapp
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d 你的实际域名
sudo nginx -t
sudo systemctl reload nginx
```

按 Certbot 提示完成证书申请和 HTTPS 跳转。只有第一次创建软链接需要 `ln -s`；已有链接时直接编辑配置。

验证：

- `https://你的实际域名/api/v1/system/health`：返回 `UP`。
- `https://你的实际域名/api/v1/home`：返回模块数组，空数组表示尚未配置入口。
- `https://你的实际域名/admin/`：用服务器 `.env` 中的管理员凭据登录。
- 上传一张图片，确认对应 `/media/随机文件名` 能通过 HTTPS 打开。

### 跨域（一般不需要配）

小程序请求不受浏览器同源策略限制，后台和小程序都与接口同域，所以默认不需要跨域配置。只有把 H5 页面部署到另一个域名、并让它直接请求后端时才需要：在服务器 `.env` 写 `CORS_ALLOWED_ORIGINS=https://h5.example.com`（多个逗号分隔），重启后端生效，支持的来源只接受 `http(s)://域名[:端口]`，写错会启动失败。

注意不要和 Nginx 重复配置：如果已经在 Nginx 里加过 `add_header Access-Control-Allow-Origin`，就不要再设这个变量，否则响应出现重复的跨域头，浏览器会直接拒绝。推荐二选一——要么 Nginx 同源转发加 Nginx 头，要么后端配白名单。

## 11. 微信小程序正式上线

在本地前端项目创建不提交 Git 的 `.env.production.local`：

```dotenv
VITE_API_BASE_URL=https://你的实际域名
```

`src/manifest.json` 的 `mp-weixin.appid` 填真实 AppID，后端 WECHAT_APP_ID 必须与之对应。构建：

```powershell
$env:Path = 'D:\config\node.js;' + $env:Path
npm run build:mp-weixin
```

微信开发者工具导入 `dist/build/mp-weixin`，恢复合法域名校验，在微信公众平台按实际使用的请求和图片能力配置 HTTPS 合法域名，补齐主体、类目、备案、隐私保护指引和审核资料。

先上传体验版，使用 Android 和 iPhone 验证：游客浏览、微信真实登录、每个目标小程序的跳转及返回、后台换图和停用后的首页刷新。展示种子的 AppID/path 为空，需要你在后台配置真实目标；没有真实目标不能用“跳转成功”作为验收。

体验版通过后提交审核并发布。服务器部署成功不等于微信审核已通过。

## 12. 日常查看、备份和更新

### 日志与重启

```bash
cd /opt/miniapp
sudo docker compose ps
sudo docker compose logs --tail=100 app
sudo docker compose logs --tail=100 db
sudo docker compose restart app
```

配置中已限制 Docker 日志单文件大小和保留数量。图片在 `miniapp_uploads` 数据卷，数据库在 `miniapp_mysql_data` 数据卷；停止、重建 Java 容器不应删除它们。

### 数据库和图片备份

```bash
cd /opt/miniapp
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
sudo docker compose exec db mysqldump -uroot -p --single-transaction --no-tablespaces --set-gtid-purged=OFF --result-file=/tmp/miniapp-backup.sql miniapp
sudo docker compose cp db:/tmp/miniapp-backup.sql "backups/miniapp-$stamp.sql"
sudo docker compose cp app:/var/lib/miniapp/uploads "backups/uploads-$stamp"
```

命令询问的密码是服务器数据库 root 密码。备份后复制一份到服务器外，并在测试库实际导入验证恢复；备份文件也包含用户与管理资料，应按私有文件保存。

### 更新后端和管理页面

先备份，停止 app，再替换 Jar，最后重新创建 app 以重新挂载文件：

```bash
cd /opt/miniapp
sudo docker compose stop app
sudo cp app.jar app.jar.previous
sudo cp /你上传的新版本目录/app.jar ./app.jar
sudo cp -a /你上传的新版本目录/admin/. /var/www/miniapp/admin/
sudo docker compose up -d --force-recreate app
curl -fsS http://127.0.0.1:8080/api/v1/system/health
```

失败时停止 app，恢复 `app.jar.previous` 后重新创建 app。数据库结构变更单独执行对应升级脚本并核对兼容性，不能用换回旧 Jar 代替数据库回退。日常运维不要删除数据库或上传数据卷。

## 13. 常见故障

| 现象 | 检查方向 |
| --- | --- |
| 本地无法连接 MySQL | 执行 mysql-local.mjs status，确认用的是 3307，查看实例日志 |
| Access denied | 区分 root、应用库用户、网页管理员；确认密码属于当前实例 |
| 后端报表不存在 | 确认连接的是三表版数据库，并已执行 001-schema.sql |
| 8080 / 5173 / 5174 已占用 | 停止旧的对应应用，或让后端与 Vite 代理使用一致的新端口 |
| H5 显示无法连接后端 | 确认 Java 已启动，代理端口正确；手动模式不要误用生产 API 域名 |
| 图片上传后打不开 | 确认 Nginx 转发 /media/，并检查上传目录或数据卷仍存在 |
| 微信端请求失败 | 检查构建里的 HTTPS API 域名、合法域名设置和证书有效性 |
| 微信登录失败 | 自己的小程序 AppID/AppSecret 必须匹配，H5 不支持真实微信登录 |
| 后台密码改后仍无效 | 更新 ADMIN_PASSWORD 后重启 Java；使用 IDEA 时同步更新运行配置 |

## 本轮三表版验证

- 原 miniapp 库现只有 app_user、nav_module、nav_entry 三张表，主键和 module_id 均为 INT；保留 4 个模块、16 个展示入口。
- 后端 16 项自动化测试，验证微信网关替身登录、同 openid 复用、凭证替换与过期、管理鉴权、配置发布、图片、事务删除、Swagger 开关及跨域白名单。
- 前端 26 项测试覆盖数字用户 ID、会话、请求、首页搜索与跳转。微信真实登录和目标小程序跳转仍需填入真实配置后在微信环境验收。
- 服务器尚未准备，本文服务器步骤由你执行。本地使用 mysql,docs，服务器只启用 mysql。

## 官方参考

- [MySQL Windows 安装和配置](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html)
- [MySQL 数据目录初始化](https://dev.mysql.com/doc/refman/8.4/en/data-directory-initialization.html)
- [MySQL 官方 Docker 镜像与首次初始化规则](https://hub.docker.com/_/mysql)
- [Docker Engine 的 Ubuntu 安装步骤](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Compose 插件安装](https://docs.docker.com/compose/install/linux/)
- [Temurin 官方 Java 镜像](https://hub.docker.com/_/eclipse-temurin)
