-- 富媒体快捷回复（第一阶段） MySQL 5.7+ InnoDB utf8mb4
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `wolive_rich_replies`;
CREATE TABLE `wolive_rich_replies` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `business_id` int(11) unsigned NOT NULL DEFAULT 0,
  `service_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '0=商户通用，非0=指定客服个人',
  `group_id` int(11) unsigned NOT NULL DEFAULT 0 COMMENT '预留分组',
  `title` varchar(255) NOT NULL DEFAULT '' COMMENT '列表标题/标签',
  `category` varchar(50) NULL DEFAULT NULL COMMENT '分类',
  `tag` varchar(100) NULL DEFAULT NULL COMMENT '标签',
  `reply_type` varchar(16) NOT NULL DEFAULT 'text' COMMENT 'text,link,card,image,video,guide',
  `content` text COMMENT '纯文本或说明',
  `image_url` varchar(1024) NOT NULL DEFAULT '',
  `video_url` varchar(1024) NOT NULL DEFAULT '',
  `link_url` varchar(1024) NOT NULL DEFAULT '',
  `button_text` varchar(128) NOT NULL DEFAULT '',
  `card_title` varchar(255) NOT NULL DEFAULT '',
  `card_desc` text,
  `payload_json` text COMMENT '如步骤卡 JSON',
  `sort` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1启用 0禁用 -1删除',
  `created_at` int(11) unsigned NOT NULL DEFAULT 0,
  `updated_at` int(11) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_biz_svc_type_stat` (`business_id`,`service_id`,`reply_type`,`status`),
  KEY `idx_biz_stat` (`business_id`,`status`),
  KEY `idx_biz_cat_stat` (`business_id`,`category`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='富媒体快捷回复';

SET FOREIGN_KEY_CHECKS = 1;
