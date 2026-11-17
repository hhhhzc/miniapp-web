-- 手工部署时先执行；Docker 也可重复执行，不包含清库或删除数据操作。
CREATE DATABASE IF NOT EXISTS miniapp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

USE miniapp;
