/*
 Navicat/MySQL incremental SQL for QR channel MVP.
 Apply after install/data.sql. This script does not change wolive_chats.
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `wolive_qr_templates` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `business_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '商户ID',
  `service_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建客服ID',
  `template_name` varchar(120) NOT NULL DEFAULT '' COMMENT '模板名称',
  `image` varchar(600) NOT NULL DEFAULT '' COMMENT '模板图片',
  `remark` varchar(500) NOT NULL DEFAULT '' COMMENT '模板备注',
  `status` tinyint(1) unsigned NOT NULL DEFAULT 1 COMMENT '1启用 0禁用',
  `is_delete` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT '1删除 0正常',
  `create_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
  `update_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `business_status` (`business_id`, `status`, `is_delete`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='二维码模板表';

CREATE TABLE IF NOT EXISTS `wolive_qr_channels` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `business_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '商户ID',
  `service_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '所属客服ID',
  `template_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '二维码模板ID',
  `channel_token` varchar(64) NOT NULL DEFAULT '' COMMENT '访问令牌',
  `remark` varchar(500) NOT NULL DEFAULT '' COMMENT '客服填写备注',
  `url` varchar(1000) NOT NULL DEFAULT '' COMMENT '访问链接',
  `status` tinyint(1) unsigned NOT NULL DEFAULT 1 COMMENT '1启用 0禁用',
  `scan_count` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '扫码次数',
  `last_scan_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '最近扫码时间',
  `create_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '创建时间',
  `update_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `token` (`channel_token`) USING BTREE,
  KEY `business_service` (`business_id`, `service_id`) USING BTREE,
  KEY `template_id` (`template_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='二维码会话渠道表';

CREATE TABLE IF NOT EXISTS `wolive_qr_scan_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `business_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '商户ID',
  `service_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '客服ID',
  `template_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '模板ID',
  `channel_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '渠道ID',
  `visiter_id` varchar(200) NOT NULL DEFAULT '' COMMENT '访客ID',
  `ip` varchar(64) NOT NULL DEFAULT '' COMMENT '访客IP',
  `ip_region` varchar(255) NOT NULL DEFAULT '' COMMENT 'IP地区',
  `device_type` varchar(32) NOT NULL DEFAULT 'Other' COMMENT '设备类型',
  `user_agent` varchar(1000) NOT NULL DEFAULT '' COMMENT 'User-Agent',
  `from_url` varchar(1000) NOT NULL DEFAULT '' COMMENT '来源URL',
  `scan_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '扫码时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `channel_time` (`channel_id`, `scan_time`) USING BTREE,
  KEY `business_time` (`business_id`, `scan_time`) USING BTREE,
  KEY `visiter_id` (`visiter_id`) USING BTREE,
  KEY `ip` (`ip`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='二维码扫码记录表';

CREATE TABLE IF NOT EXISTS `wolive_ip_blacklist` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `business_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '商户ID',
  `ip` varchar(64) NOT NULL DEFAULT '' COMMENT '封禁IP',
  `ip_region` varchar(255) NOT NULL DEFAULT '' COMMENT 'IP地区',
  `reason` varchar(500) NOT NULL DEFAULT '' COMMENT '封禁原因',
  `service_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '操作客服ID',
  `status` tinyint(1) unsigned NOT NULL DEFAULT 1 COMMENT '1封禁 0解禁',
  `create_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '封禁时间',
  `release_time` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '解禁时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `business_ip` (`business_id`, `ip`) USING BTREE,
  KEY `status` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='IP黑名单表';

ALTER TABLE `wolive_visiter`
  ADD COLUMN `device_type` varchar(32) NOT NULL DEFAULT 'Other' COMMENT '设备类型' AFTER `extends`,
  ADD COLUMN `ip_region` varchar(255) NOT NULL DEFAULT '' COMMENT 'IP地区' AFTER `device_type`,
  ADD COLUMN `qr_channel_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '二维码渠道ID' AFTER `ip_region`,
  ADD COLUMN `qr_remark` varchar(500) NOT NULL DEFAULT '' COMMENT '二维码备注' AFTER `qr_channel_id`;

SET FOREIGN_KEY_CHECKS = 1;
