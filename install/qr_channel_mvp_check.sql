/*
  qr_channel_mvp_check.sql — 仅做存在性检查，不修改表结构。
  在已导入业务库后执行；若有 MISSING，请先执行 install/qr_channel_mvp.sql。
  MySQL 5.5+ / MariaDB 10+，使用 information_schema。
*/

SET NAMES utf8mb4;

SELECT 'wolive_qr_templates' AS object,
       IF(COUNT(*) >= 1, 'OK', 'MISSING_TABLE') AS result
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'wolive_qr_templates';

SELECT 'wolive_qr_channels' AS object,
       IF(COUNT(*) >= 1, 'OK', 'MISSING_TABLE') AS result
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'wolive_qr_channels';

SELECT 'wolive_qr_scan_logs' AS object,
       IF(COUNT(*) >= 1, 'OK', 'MISSING_TABLE') AS result
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'wolive_qr_scan_logs';

SELECT 'wolive_ip_blacklist' AS object,
       IF(COUNT(*) >= 1, 'OK', 'MISSING_TABLE') AS result
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'wolive_ip_blacklist';

SELECT 'wolive_visiter.device_type' AS object,
       IF(COUNT(*) >= 1, 'OK', 'MISSING_COLUMN') AS result
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'wolive_visiter' AND column_name = 'device_type';

SELECT 'wolive_visiter.ip_region' AS object,
       IF(COUNT(*) >= 1, 'OK', 'MISSING_COLUMN') AS result
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'wolive_visiter' AND column_name = 'ip_region';

SELECT 'wolive_visiter.qr_channel_id' AS object,
       IF(COUNT(*) >= 1, 'OK', 'MISSING_COLUMN') AS result
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'wolive_visiter' AND column_name = 'qr_channel_id';

SELECT 'wolive_visiter.qr_remark' AS object,
       IF(COUNT(*) >= 1, 'OK', 'MISSING_COLUMN') AS result
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'wolive_visiter' AND column_name = 'qr_remark';
