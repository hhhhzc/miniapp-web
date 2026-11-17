# 第一版开发与使用

已在现有两个项目实现：黄色模块首页、五列图标、双列活动卡片、轮播横幅、首页内容搜索、游客跳转、微信登录入口、隐私说明、独立网页管理后台、模块与入口增删改查、排序、上下架和图片上传。

前端：`D:\IDEA work\miniapp-web`。后端：`D:\IDEA work\miniapp-app`。所有内容存数据库，图片存独立持久化目录。管理端源码在 `admin-web/`，与小程序共用现有依赖，不必单独安装另一份 node_modules。

## 本地运行

1. 安装 Node 20+ 和 Java 21+。现有机器可使用 `D:\config\node.js` 和 IDEA 自带 JBR；本轮验证使用 JBR 25，Java 编译目标仍为 21。
2. 前端运行 `npm ci`（依赖已经存在时跳过）。在后端先运行 `mvn package`，或使用现有 `dev.ps1 -Action Build -JavaHome ... -MavenHome ...`。
3. 在前端目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

脚本询问至少 12 位管理密码，默认用户名 `admin`，随后启动后端、H5 和管理后台。密码不回显，不写入源码。已存在的账号保留原密码，环境变量不会覆盖已有密码。

- H5 首页：`http://127.0.0.1:5173/`。
- 管理后台：`http://127.0.0.1:5174/admin/`。
- 后端：`http://127.0.0.1:8080`。
- Ctrl+C 停止本次脚本创建的进程。端口被占用时先停止旧进程，脚本使用固定端口避免链接混淆。

也可分别运行 `npm run dev:h5`、`npm run dev:admin` 和后端 Jar。首次启动 Jar 前设置 `ADMIN_USERNAME`、`ADMIN_PASSWORD`；不配置时后端仍能启动，但不会创建默认管理员。

微信开发者工具导入 `dist/build/mp-weixin`（或运行 `npm run dev:mp-weixin` 后导入 `dist/dev/mp-weixin`）。H5 只验证页面、搜索和后台配置，微信真实登录和第三方跳转必须在微信小程序中验收。

## 配置入口

1. 登录后台，创建模块并选择图标宫格、双列卡片或轮播横幅。
2. 新增入口，填写名称、说明、主题色、角标、排序和图片。
3. 图片支持真实 PNG / JPEG，文件不超过 2MB、宽高各不超过 4096px。服务端检查并重新编码图片，使用随机文件名；不支持 SVG / WebP。
4. 选择“打开微信小程序”并填写真实 AppID（`wx` 加 16 位十六进制字符）；path 可留空打开目标首页。网页链接不能作为 path 使用；附加参数须为 JSON 对象。
5. 保存后小程序重新显示首页或下拉刷新获取最新内容。后台的停用操作隐藏内容；已经打开的页面不会被即时推送更新。

`NONE` 表示仅展示，前台显示“敬请期待”；不会伪造领券成功。默认本地数据有 4 个模块、16 个入口，均为仅展示状态，不含真实平台地址、优惠金额或订单。正式使用请替换素材与地址。

本地演示数据只初始化一次；编辑、删除后的内容在重启时保留。初始化标记存于 `nav_seed_marker`，勿在已有运营数据的环境手动删除它。

## 后端接口

统一返回 `{code, message, data}`。公开首页 `GET /api/v1/home` 只返回已启用模块及其中已启用的入口，空模块隐藏，按排序值、id 稳定排序；返回 `Cache-Control: no-store`。

| 路径 | 方法 | 权限 |
| --- | --- | --- |
| `/api/v1/home` | GET | 公开 |
| `/api/v1/auth/wechat-login` | POST | 复用原微信登录 |
| `/api/v1/admin/auth/login` | POST | 账号密码，限制登录尝试频率 |
| `/api/v1/admin/auth/logout` | POST | 管理会话 |
| `/api/v1/admin/modules` | GET / POST | 管理会话 |
| `/api/v1/admin/modules/{id}` | PUT / DELETE | 管理会话 |
| `/api/v1/admin/entries` | POST | 管理会话 |
| `/api/v1/admin/entries/{id}` | PUT / DELETE | 管理会话 |
| `/api/v1/admin/files` | POST，multipart 字段 file | 管理会话 |
| `/media/{随机文件名}` | GET | 公开图片 |

编辑请求需要完整字段，尤其 `sortOrder` 和 `enabled`。入口列表包含在模块响应的 `entries` 中。模块删除会在一个事务内删除其入口。

管理密码使用带独立盐的 PBKDF2-HMAC-SHA256 哈希。管理 Token 独立于微信用户 Token，数据库仅保存摘要，有效期 8 小时；退出会从服务端注销。后台在浏览器 sessionStorage 保存该标签页的会话，关闭标签页后需重新登录。

## 正式部署

1. 创建 MySQL 数据库，使用 `utf8mb4` 字符集以支持中文和表情字符。
2. 新库先执行后端 `app/src/main/resources/db/schema.sql`，再执行 `navigation-schema.sql`。已有业务库只补执行 `navigation-schema.sql`，不要清空原表。MySQL 模式不自动建表。
3. 如需初始展示内容，可在新库手工执行 `navigation-demo.sql`；生产默认不导入演示数据。
4. 设置后端环境变量：

```text
SPRING_PROFILES_ACTIVE=mysql
DB_URL=实际 MySQL JDBC 地址
DB_USERNAME=数据库账号
DB_PASSWORD=数据库密码
ADMIN_USERNAME=初始化管理账号
ADMIN_PASSWORD=至少12位的初始化密码
WECHAT_APP_ID=自己的微信小程序AppID
WECHAT_APP_SECRET=自己的微信小程序AppSecret
MEDIA_DIRECTORY=/var/lib/miniapp/uploads
SERVER_ADDRESS=127.0.0.1
```

5. 运行后端 Jar。密码只用于首次初始化，后续保留库中哈希。管理账号不可公开注册；生产不启用 local profile 或开发体验登录。
6. 前端在不提交 Git 的 `.env.production.local` 设置 `VITE_API_BASE_URL=https://实际接口域名`，在 `src/manifest.json` 的 `mp-weixin.appid` 填入自己的 AppID。
7. 运行 `npm run build:admin` 与 `npm run build:mp-weixin`。管理后台产物为 `dist/admin`；小程序产物为 `dist/build/mp-weixin`。
8. 将管理端部署到 `/admin/`，用 Nginx 代理 `/api/` 和 `/media/` 到后端。参考 `deploy/nginx.conf.example`；示例中的域名、证书和目录需要替换。MySQL 端口不对公网开放。
9. 持久化并备份数据库和 `MEDIA_DIRECTORY`，验证恢复；后端重启或覆盖 Jar 不应删除图片目录。
10. 微信后台配置实际 HTTPS 接口域名与图片使用所需配置，补齐主体、类目、备案、隐私保护指引和素材后提审。所有首发平台入口都要在 Android 与 iPhone 微信上测试。

当前版本没有返佣、联盟订单回传、用户签到或超省卡服务；原订单代码保留，但订单导航已隐藏。

## 验证记录

- 前端 27 项自动化测试通过，覆盖会话、请求竞态、首页筛选、图片地址、空 path、附加参数及取消跳转。
- 后端 13 项集成测试通过，含 6 项新增测试，覆盖管理权限、发布过滤、目标校验、图片存取、会话失效、事务删除及停用管理员不会被初始化重新启用。
- 小程序、H5、管理端均可构建。
- 使用隔离 H2 数据库完成实际 HTTP 登录、编辑、读取和退出验收，并在浏览器中验证搜索、后台登录和入口编辑保存。
- 浏览器截图在 `docs/screenshots/`。真实微信登录、第三方真实跳转和 MySQL 生产部署尚待实际凭据及环境验证。
