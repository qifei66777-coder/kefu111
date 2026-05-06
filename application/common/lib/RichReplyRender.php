<?php

namespace app\common\lib;

/**
 * 富媒体快捷回复：由结构化数据生成安全 HTML（禁止客服直接输入 HTML）
 */
class RichReplyRender
{
    const TYPES = ['text', 'link', 'card', 'image', 'video', 'guide'];

    public static function esc($s)
    {
        return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    }

    /**
     * URL 中禁止事件类注入（onerror=、onload= 等）
     */
    public static function urlLooksDangerous($url)
    {
        return (bool) preg_match('/\bon[a-z]+\s*=/i', (string) $url);
    }

    /**
     * 链接类 URL：仅 http/https
     */
    public static function sanitizeHttpUrl($url)
    {
        $url = trim((string) $url);
        if ($url === '') {
            return '';
        }
        if (self::urlLooksDangerous($url)) {
            return '';
        }
        $lower = strtolower($url);
        if (strpos($lower, 'javascript:') === 0 || strpos($lower, 'data:') === 0 || strpos($lower, 'vbscript:') === 0) {
            return '';
        }
        $parts = @parse_url($url);
        if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
            return '';
        }
        $scheme = strtolower($parts['scheme']);
        if ($scheme !== 'http' && $scheme !== 'https') {
            return '';
        }
        if (preg_match('/[\s\x00-\x1f]/', $url)) {
            return '';
        }

        return $url;
    }

    /**
     * 图片/视频地址：http/https，或站内以 /upload/ 开头的相对路径（禁止 ..）
     */
    public static function sanitizeMediaUrl($url)
    {
        $url = trim((string) $url);
        if ($url === '') {
            return '';
        }
        if (self::urlLooksDangerous($url)) {
            return '';
        }
        $lower = strtolower($url);
        if (strpos($lower, 'javascript:') === 0 || strpos($lower, 'data:') === 0 || strpos($lower, 'vbscript:') === 0) {
            return '';
        }
        if ($url[0] === '/') {
            if (strpos($url, '..') !== false || preg_match('/[\s\x00-\x1f]/', $url)) {
                return '';
            }
            if (preg_match('#^/upload/#', $url)) {
                return $url;
            }

            return '';
        }

        return self::sanitizeHttpUrl($url);
    }

    /**
     * @param array $r 表字段行
     */
    public static function renderRichReplyHtml(array $r)
    {
        $type = isset($r['reply_type']) ? $r['reply_type'] : 'text';
        if (!in_array($type, self::TYPES, true)) {
            $type = 'text';
        }

        switch ($type) {
            case 'link':
                $inner = self::renderLink($r);
                break;
            case 'card':
                $inner = self::renderCard($r);
                break;
            case 'image':
                $inner = self::renderImage($r);
                break;
            case 'video':
                $inner = self::renderVideo($r);
                break;
            case 'guide':
                $inner = self::renderGuide($r);
                break;
            case 'text':
            default:
                $inner = self::renderText($r);
                break;
        }

        return '<div class="wolive-rich-reply" data-rich-reply="1" data-reply-type="' . self::esc($type) . '">' . $inner . '</div>';
    }

    protected static function renderText(array $r)
    {
        $html = '';
        if (trim((string) $r['title']) !== '') {
            $html .= '<div class="wolive-rich-reply__title">' . self::esc($r['title']) . '</div>';
        }
        $html .= '<div class="wolive-rich-reply__text">' . nl2br(self::esc($r['content'])) . '</div>';

        return $html;
    }

    protected static function renderLink(array $r)
    {
        $html = '';
        if (trim((string) $r['title']) !== '') {
            $html .= '<div class="wolive-rich-reply__title">' . self::esc($r['title']) . '</div>';
        }
        if (trim((string) $r['content']) !== '') {
            $html .= '<div class="wolive-rich-reply__text">' . nl2br(self::esc($r['content'])) . '</div>';
        }
        $href = self::sanitizeHttpUrl($r['link_url']);
        $btn = trim((string) $r['button_text']) !== '' ? self::esc($r['button_text']) : '打开链接';
        if ($href !== '') {
            $safeHref = self::esc($href);
            $html .= '<a class="wolive-rich-reply__btn" href="' . $safeHref . '" target="_blank" rel="noopener noreferrer">' . $btn . '</a>';
        }

        return $html;
    }

    protected static function renderCard(array $r)
    {
        $html = '<div class="wolive-rich-reply__card-inner">';
        $imgUrl = self::sanitizeMediaUrl($r['image_url']);
        if ($imgUrl !== '') {
            $html .= '<div class="wolive-rich-reply__media"><img class="wolive-rich-reply__img" src="' . self::esc($imgUrl) . '" alt="' . self::esc($r['card_title']) . '"/></div>';
        }
        if (trim((string) $r['card_title']) !== '') {
            $html .= '<div class="wolive-rich-reply__card-title">' . self::esc($r['card_title']) . '</div>';
        }
        if (trim((string) $r['card_desc']) !== '') {
            $html .= '<div class="wolive-rich-reply__card-desc">' . nl2br(self::esc($r['card_desc'])) . '</div>';
        }
        $href = self::sanitizeHttpUrl($r['link_url']);
        $btn = trim((string) $r['button_text']) !== '' ? self::esc($r['button_text']) : '查看详情';
        if ($href !== '') {
            $html .= '<a class="wolive-rich-reply__btn" href="' . self::esc($href) . '" target="_blank" rel="noopener noreferrer">' . $btn . '</a>';
        }
        $html .= '</div>';

        return $html;
    }

    protected static function renderImage(array $r)
    {
        $html = '';
        if (trim((string) $r['title']) !== '') {
            $html .= '<div class="wolive-rich-reply__title">' . self::esc($r['title']) . '</div>';
        }
        $imgUrl = self::sanitizeMediaUrl($r['image_url']);
        if ($imgUrl !== '') {
            $html .= '<div class="wolive-rich-reply__media"><img class="wolive-rich-reply__img" src="' . self::esc($imgUrl) . '" alt="' . self::esc($r['title']) . '"/></div>';
        } else {
            $html .= '<div class="wolive-rich-reply__muted">图片地址无效</div>';
        }
        if (trim((string) $r['content']) !== '') {
            $html .= '<div class="wolive-rich-reply__caption">' . nl2br(self::esc($r['content'])) . '</div>';
        }

        return $html;
    }

    protected static function renderVideo(array $r)
    {
        $html = '';
        if (trim((string) $r['title']) !== '') {
            $html .= '<div class="wolive-rich-reply__title">' . self::esc($r['title']) . '</div>';
        }
        $vUrl = self::sanitizeMediaUrl($r['video_url']);
        if ($vUrl !== '') {
            $safe = self::esc($vUrl);
            $html .= '<div class="wolive-rich-reply__video-box">';
            $html .= '<div class="wolive-rich-reply__video-wrap"><video class="wolive-rich-reply__video" controls playsinline preload="metadata" src="' . $safe . '"></video></div>';
            $html .= '<a class="wolive-rich-reply__video-link" href="' . $safe . '" target="_blank" rel="noopener noreferrer">打开视频链接</a>';
            $html .= '</div>';
        } else {
            $html .= '<div class="wolive-rich-reply__muted">视频地址无效</div>';
        }
        if (trim((string) $r['content']) !== '') {
            $html .= '<div class="wolive-rich-reply__caption">' . nl2br(self::esc($r['content'])) . '</div>';
        }

        return $html;
    }

    protected static function renderGuide(array $r)
    {
        $html = '';
        if (trim((string) $r['title']) !== '') {
            $html .= '<div class="wolive-rich-reply__title">' . self::esc($r['title']) . '</div>';
        }
        $steps = [];
        $raw = isset($r['payload_json']) ? trim((string) $r['payload_json']) : '';
        $jsonOk = false;
        if ($raw !== '') {
            $j = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($j)) {
                $jsonOk = true;
                if (isset($j['steps']) && is_array($j['steps'])) {
                    $steps = $j['steps'];
                } else {
                    $steps = $j;
                }
            }
        }

        $renderOlFromSteps = function ($stepList) use (&$html) {
            $html .= '<ol class="wolive-rich-reply__steps">';
            foreach ($stepList as $item) {
                if (is_array($item)) {
                    $line = isset($item['text']) ? $item['text'] : (isset($item['title']) ? $item['title'] : '');
                } else {
                    $line = $item;
                }
                $line = trim((string) $line);
                if ($line === '') {
                    continue;
                }
                $html .= '<li class="wolive-rich-reply__step"><span class="wolive-rich-reply__step-body">' . nl2br(self::esc($line)) . '</span></li>';
            }
            $html .= '</ol>';
        };

        $stepLines = [];
        foreach ($steps as $item) {
            if (is_array($item)) {
                $line = isset($item['text']) ? $item['text'] : (isset($item['title']) ? $item['title'] : '');
            } else {
                $line = $item;
            }
            $line = trim((string) $line);
            if ($line !== '') {
                $stepLines[] = $line;
            }
        }

        if ($jsonOk && $stepLines) {
            $renderOlFromSteps($steps);
        } elseif (trim((string) $r['content']) !== '') {
            $lines = preg_split('/\r\n|\r|\n/', $r['content']);
            $nonEmpty = [];
            foreach ($lines as $line) {
                $line = trim((string) $line);
                if ($line !== '') {
                    $nonEmpty[] = $line;
                }
            }
            if ($nonEmpty) {
                $renderOlFromSteps($nonEmpty);
            }
        } elseif ($raw !== '') {
            $html .= '<div class="wolive-rich-reply__guide-fallback">' . nl2br(self::esc($raw)) . '</div>';
        }

        return $html;
    }
}
