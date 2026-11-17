# miniapp-web

券小站前端，独立的 **uni-app + Vue 3 + Vite + JavaScript** 项目。

- 前端目录：`D:\IDEA work\miniapp-web`。
- 对应后端：`D:\IDEA work\miniapp-app`，保留六模块 DDD 设计。
- 前端开发服务：`http://127.0.0.1:5173`，后端默认：`http://127.0.0.1:8080`。
- 独立仓库：`git@github.com:hhhhzc/miniapp-web.git`。

## 组织方式

| 位置 | 职责 |
| --- | --- |
| src/pages/home | 领券首页、平台活动入口和推广跳转流程 |
| src/pages/orders | 登录用户的个人订单列表 |
| src/pages/profile | 微信登录、个人中心、开发连接设置 |
| src/services/api.js | 业务接口定义 |
| src/services/request.js | HTTP 请求、token、超时和统一错误处理 |
| src/services/session.js | 本机登录会话存储 |
| src/services/navigation.js | 平台小程序跳转 |
| src/composables/useAsyncResource.js | 页面共享异步加载状态，避免过期请求覆盖新结果 |
| src/constants/storage.js | 统一管理本地存储键 |
| src/utils | 日期、金额、状态等格式化 |
| src/config.js | API 地址和开发开关 |
| src/pages.json | 页面路由和底部导航 |
| src/manifest.json | 平台 AppID 等配置 |

页面使用 Vue Composition API 和 ref 维护状态，登录信息通过 uni 本地存储管理。当前没有 Pinia 或额外 UI 组件库。现有三个页面使用页面层、接口层、请求层和共享 composable，规模扩大后再提取重复 UI 组件。

公共接口不携带 token，个人订单等受保护接口显式启用认证。请求会记录发起时的接口地址与会话，过期响应不能覆盖新账号状态，旧401也不会清除新登录。会话到期或存储损坏时自动清除。

## 启动

需要 Node 20+。已提供 package-lock.json，可使用 npm ci 安装固定版本依赖。

```powershell
$env:Path = 'D:\config\node.js;' + $env:Path
cd 'D:\IDEA work\miniapp-web'
npm ci
npm run dev:mp-weixin
```

在 `src/manifest.json` 的 `mp-weixin.appid` 填入自己的微信小程序 AppID，将 `D:\IDEA work\miniapp-web\dist\dev\mp-weixin` 导入微信开发者工具。本地 HTTP 联调时在开发者工具中关闭域名校验；发布前恢复，并配置 HTTPS 合法域名。

请先执行 `npm run dev:mp-weixin` 生成编译产物。根目录下的 `project.config.json`、`project.private.config.json` 是开发者工具本地配置，已忽略，不作为 uni-app 源码配置提交。

HBuilderX 也可以直接导入本项目。H5 开发预览使用 `npm run dev:h5`，默认通过 Vite 的 `/api` 代理访问后端，无需额外配置后端 CORS。H5 用于页面与开发账号联调；微信真实登录和小程序跳转在微信端使用。

## 业务与环境

默认首页展示后端提供的活动入口。联盟接口尚待文档接入，未配置的平台按钮会显示“待接入”；没有虚构的优惠金额、链接和订单。

`.env.development` 默认启用开发体验登录按钮，只在开发构建显示，需要后端 local profile 配合。这是共享体验身份，不代表真实微信登录。

开发时可在个人中心修改服务器地址；清空地址并保存可恢复默认值：H5 走 `/api` 同源代理，微信开发环境使用 `http://127.0.0.1:8080`。切换服务器会清除原服务器的本机登录信息。

生产 API 可写入不提交 Git 的 `.env.production.local`：

```dotenv
VITE_API_BASE_URL=https://你的接口域名
```

生产构建忽略开发时保存的接口地址，始终隐藏开发登录和连接设置。微信生产请求必须配置接口地址；H5 生产环境可配置该地址，或通过同源反向代理转发 `/api`。

AppSecret、数据库密码和联盟密钥只放后端，不能配置在前端。手机真机开发时用电脑局域网 IP 访问后端，同一网络下联调。

## 检查与构建

```powershell
npm test
npm run build:mp-weixin
npm run build:h5
```

微信生产产物在 `dist/build/mp-weixin`，H5 生产产物在 `dist/build/h5`。源码与 package-lock.json 提交到前端独立仓库；node_modules、dist、缓存和本地环境配置不提交。

详见 [架构与检查记录](docs/architecture-review.md)。
