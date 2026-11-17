# 当前简版开发与使用

本版只做微信登录，以及首页模块、图片和跳转入口配置。详细数据库、Swagger、IDEA 联调和服务器步骤见 [操作手册](deployment-and-debugging.md)。

## 本机启动

在前端目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Database MySQL
```

- 首页：http://127.0.0.1:5173/
- 管理后台：http://127.0.0.1:5174/admin/
- Swagger：http://127.0.0.1:8080/swagger-ui/index.html
- MySQL：127.0.0.1:3307，库 miniapp，应用账号 miniapp，密码 miniapp123。

后台管理员为 admin / miniapp123；本地 MySQL root、miniapp 账号也统一使用 miniapp123。

配合 IDEA Debug 时复制 D:\config\miniapp-mysql\idea-environment.txt 到后端运行环境变量，再用启动脚本的 -FrontendOnly 参数只启动前端。端口改为 8081 时加 -BackendPort 8081。

## 三张表

| 表 | 用途 |
| --- | --- |
| app_user | 微信登录用户，openid 唯一；当前凭证直接放在用户行 |
| nav_module | 动态首页模块，支持新增、排序、启停和删除 |
| nav_entry | 模块内的标题、图片、小程序 AppID 与路径 |

主键统一为自增 INT。后台单管理员使用服务端配置，后台登录保存在内存，重启后重新登录。移除了原来的订单、优惠活动和联盟推广预留功能。

## 配置首页

登录后台 → 新增模块 → 选择宫格、卡片或横幅 → 添加入口 → 上传图片 → 填真实 AppID 和页面路径 → 启用。小程序重新进入首页或下拉刷新后生效。

未准备真实目标时可选择“仅展示”。浏览公开首页和打开目标小程序无需本站登录；微信登录需要自己的小程序 AppID / AppSecret，后端通过临时 code 换取 openid。

## 上线

运行 scripts/package-release.ps1 生成含 Jar、管理页面、三表 SQL 与服务器模板的 ZIP。新服务器按操作手册部署；小程序另外构建 build:mp-weixin、上传体验版并审核发布。旧版本上线包是十表方案，请使用本次三表版新包。
