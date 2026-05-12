/*
  ip_blacklist_extend.sql — 为 IP 黑名单增加操作人字段（可选增量执行）。
  若列已存在，请忽略重复执行报错。
*/

SET NAMES utf8mb4;

ALTER TABLE `wolive_ip_blacklist`
  ADD COLUMN `created_by_type` varchar(32) NOT NULL DEFAULT '' COMMENT 'service|manager|super_manager' AFTER `service_id`,
  ADD COLUMN `created_by` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '操作人对应 service_id' AFTER `created_by_type`;
