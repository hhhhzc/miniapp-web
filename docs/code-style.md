# 代码格式和中文注释约定

前后端使用统一格式化入口。前端使用 2 空格缩进，Java/XML 使用 4 空格；使用 LF 换行，长表达式和参数列表自动换行。Vue/HTML 属性逐行排列，CSS 每个属性单独一行。

在前端项目目录执行：

```powershell
npm run format
npm run format:check
```

`format` 同时整理本项目和相邻 `miniapp-app` 后端，`format:check` 只检查，发现不一致时返回非零退出码。也可分别运行：

```powershell
npm run format:frontend
npm run format:backend
```

后端不在相邻目录时，通过 `MINIAPP_BACKEND_DIR` 环境变量指定后端根目录。Java/XML 格式化依赖由前端开发工具统一安装；后端 `.editorconfig` 仍保留 Java/XML 的 4 空格约定，供 IDEA 使用。

格式化范围包含前端源码、管理页面、测试、脚本，以及后端六个模块的 Java、SQL、YAML 和 POM。排除 node_modules、构建产物、本地缓存、运行数据、历史模板参考文件和密钥配置。

后台的 HTML 模板通过 `/* HTML */` 标记启用嵌入格式化，保留现有 Vue 运行时结构。JDBC 过长的普通 SQL 字符串采用常量拼接换行，每个原始字符保持不变；独立 SQL 文件只整理排版。

中文注释主要说明：

- Java 类的职责、领域接口的约定、请求和响应的用途。
- 登录、Token 摘要存储、账号停用、鉴权隔离和过期请求处理。
- 配置筛选、目标地址限制、事务边界、图片校验和持久化条件。
- Vue 页面状态与生命周期、模板分区、样式分组和跨平台条件编译。
- 配置文件中的环境差异、默认行为及部署时需要保留的数据。

接口、字段或流程发生变化时，应同步更新对应中文注释。Java 方法说明放在注解之前，便于 IDE 和 Javadoc 正确识别；JSON 文件保持标准 JSON，其配置说明写入项目文档。
