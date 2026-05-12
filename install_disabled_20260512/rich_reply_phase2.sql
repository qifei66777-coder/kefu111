-- 富媒体快捷回复 第二阶段：分类 / 标签（已有表增量变更）
SET NAMES utf8mb4;

ALTER TABLE `wolive_rich_replies`
  ADD COLUMN `category` VARCHAR(50) NULL DEFAULT NULL COMMENT '分类' AFTER `title`,
  ADD COLUMN `tag` VARCHAR(100) NULL DEFAULT NULL COMMENT '标签' AFTER `category`;

ALTER TABLE `wolive_rich_replies`
  ADD KEY `idx_biz_cat_stat` (`business_id`, `category`, `status`);
