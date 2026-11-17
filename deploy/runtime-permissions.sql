-- 官方 MySQL 镜像先创建 miniapp 用户，再执行初始化文件。
-- 表由 root 初始化；运行中的 Java 应用只需增删改查。
REVOKE ALL PRIVILEGES ON miniapp.*
FROM
  'miniapp' @'%';

GRANT
SELECT
,
INSERT
,
UPDATE,
DELETE ON miniapp.* TO 'miniapp' @'%';
