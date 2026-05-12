-- 扫码自动欢迎语：商户配置 + 防重复日志（可重复执行时若列/表已存在会报错，可忽略）
-- 1) 商户表扩展
ALTER TABLE `wolive_business`
  ADD COLUMN `scan_welcome_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '扫码欢迎语开关 1开0关' AFTER `remark`;
ALTER TABLE `wolive_business`
  ADD COLUMN `scan_welcome_message` TEXT NULL COMMENT '商户扫码欢迎语(纯文本/HTML实体存储)' AFTER `scan_welcome_enabled`;

-- 2) 同一访客+渠道仅展示一次（business_id+channel_id+visiter_id）
CREATE TABLE IF NOT EXISTS `wolive_qr_welcome_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL DEFAULT 0,
  `channel_id` int(11) NOT NULL DEFAULT 0,
  `visiter_id` varchar(200) NOT NULL,
  `created_at` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_biz_channel_visiter` (`business_id`,`channel_id`,`visiter_id`),
  KEY `idx_biz` (`business_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='扫码欢迎语已展示记录';
