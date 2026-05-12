-- ============================================================
-- 升级 wolive_chats 字符集到 utf8mb4，让消息支持 4 字节 emoji
-- ============================================================
-- 背景：默认建表使用 utf8（实际是 utf8mb3），存储 emoji 时会被截断或报错。
-- 本脚本仅修改字符集与排序规则，不改变字段结构、不影响业务数据。
-- 执行前建议先备份。
-- 执行命令：
--   mysql -u 用户 -p 数据库名 < install/upgrade_chats_utf8mb4.sql
-- ============================================================

-- 1. 转表层默认字符集
ALTER TABLE `wolive_chats`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 转关键字段（visiter_id / content / state / direction / unstr / avatar）
ALTER TABLE `wolive_chats`
  MODIFY COLUMN `visiter_id` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '访客id',
  MODIFY COLUMN `content`    mediumtext   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '内容',
  MODIFY COLUMN `state`      enum('readed','unread') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unread' COMMENT 'unread 未读；readed 已读',
  MODIFY COLUMN `direction`  enum('to_visiter','to_service') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  MODIFY COLUMN `unstr`      varchar(60)   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '前端唯一字符串用于撤销使用',
  MODIFY COLUMN `avatar`     varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '发送者头像';

-- 3. 顺手把访客昵称、留言相关也升级（emoji 经常出现在昵称/评价里）
ALTER TABLE `wolive_visiter`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `wolive_visiter`
  MODIFY COLUMN `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL;

-- 4. 评价表
ALTER TABLE `wolive_comment`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 完成后建议在 MySQL 配置 [mysqld] 段加：character-set-server=utf8mb4 / collation-server=utf8mb4_unicode_ci
-- 然后重启 mysql，确保新连接默认 utf8mb4
