<?php

namespace app\common\lib;

use think\Db;

/**
 * 扫码进入会话后的欢迎语：不写 wolive_chats，通过 Session 闪存交给 H5 首屏展示一次。
 */
class QrWelcome
{
    const SESSION_KEY = 'qr_welcome_flash';

    const DEFAULT_TEXT = '您好，欢迎咨询，请描述您的问题，我会尽快为您处理。';

    /**
     * kfchat 校验通过后调用：开关、去重、写日志、写入 session 闪存。
     *
     * @param array $business   wolive_business 行（数组）
     * @param int   $channelId  渠道 id
     * @param string $visiterId
     * @param array $serviceRow wolive_service 行
     */
    public static function tryCommitOnKfchat(array $business, $channelId, $visiterId, array $serviceRow)
    {
        $bid = (int) $business['id'];
        $sid = (int) $serviceRow['service_id'];
        $enabled = isset($business['scan_welcome_enabled']) ? (int) $business['scan_welcome_enabled'] : 1;
        if (!$enabled) {
            return;
        }
        $channelId = (int) $channelId;
        if ($bid <= 0 || $channelId <= 0 || $visiterId === '') {
            return;
        }
        if (Db::name('qr_welcome_logs')->where(['business_id' => $bid, 'channel_id' => $channelId, 'visiter_id' => $visiterId])->find()) {
            return;
        }
        $content = self::resolveWelcomeContent($business, $sid);
        if ($content === null || trim(strip_tags($content)) === '') {
            $content = self::DEFAULT_TEXT;
        }
        try {
            Db::name('qr_welcome_logs')->insert([
                'business_id' => $bid,
                'service_id'  => $sid,
                'channel_id'  => $channelId,
                'visiter_id'  => $visiterId,
                'created_at'  => time(),
            ]);
        } catch (\Exception $e) {
            return;
        }
        $avatar = isset($serviceRow['avatar']) ? $serviceRow['avatar'] : '';
        session(self::SESSION_KEY, [
            'business_id' => $bid,
            'visiter_id'  => $visiterId,
            'content'     => $content,
            'avatar'      => $avatar,
        ]);
    }

    /**
     * 优先级：客服常用语(using) > 商户 scan_welcome_message > 默认文案（默认在调用方处理空串）
     *
     * @param array $business
     * @param int   $serviceId
     * @return string
     */
    public static function resolveWelcomeContent(array $business, $serviceId)
    {
        $words = model('sentence')->where('service_id', $serviceId)->where('state', 'using')->find();
        if ($words && isset($words['content'])) {
            $decoded = htmlspecialchars_decode($words['content'], ENT_QUOTES);
            if (trim(strip_tags($decoded)) !== '') {
                return $decoded;
            }
        }
        $m = isset($business['scan_welcome_message']) ? trim($business['scan_welcome_message']) : '';
        if ($m !== '') {
            return htmlspecialchars_decode($m, ENT_QUOTES);
        }

        return self::DEFAULT_TEXT;
    }

    /**
     * 对话页取出闪存（匹配 business_id + visiter_id 后清除），供模板输出 JSON。
     *
     * @param int    $businessId
     * @param string $visiterId
     * @return array|null {content, avatar}
     */
    public static function pullFlashForChat($businessId, $visiterId)
    {
        $s = session(self::SESSION_KEY);
        if (!$s || !is_array($s)) {
            return null;
        }
        if ((int) $s['business_id'] !== (int) $businessId || $s['visiter_id'] !== $visiterId) {
            return null;
        }
        session(self::SESSION_KEY, null);

        return [
            'content' => isset($s['content']) ? $s['content'] : '',
            'avatar'  => isset($s['avatar']) ? $s['avatar'] : '',
        ];
    }
}
