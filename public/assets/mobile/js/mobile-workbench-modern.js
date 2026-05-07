(function ($) {
    'use strict';

    var blacklistLoaded = false;

    function rootUrl(path) {
        return (window.YMWL_ROOT_URL || '') + path;
    }

    function html(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showTab(tab) {
        $('.mobile-workbench-tab').removeClass('is-active');
        $('.mobile-workbench-tab[data-tab="' + tab + '"]').addClass('is-active');

        if (tab === 'chat') {
            window.chatSwiper.slideTo(0, 0);
            $('.mobile-workbench-plus').show();
        } else if (tab === 'blacklist') {
            window.chatSwiper.slideTo(2, 0);
            $('.mobile-workbench-plus').hide();
            loadBlacklist();
        } else if (tab === 'my') {
            window.chatSwiper.slideTo($('.swiper-slide').length - 1, 0);
            $('.mobile-workbench-plus').hide();
        }
    }

    function normalizeList(res) {
        if (!res) {
            return [];
        }
        if (Array.isArray(res.data)) {
            return res.data;
        }
        if (res.data && Array.isArray(res.data.data)) {
            return res.data.data;
        }
        return [];
    }

    function renderBlacklist(rows) {
        var $list = $('#MobileBlacklistList');
        if (!rows.length) {
            $list.html('<div class="mobile-blacklist-empty">暂无 IP 黑名单</div>');
            return;
        }

        var output = '';
        $.each(rows, function (_, item) {
            var id = item.id || '';
            var ip = item.ip || '';
            var name = item.visiter_name || item.customer_name || item.service_nickname || item.service_name || '';
            var region = item.region || item.ip_region || '';
            var time = item.created_at || item.create_time || item.ban_time || '';
            var reason = item.reason || '';

            output += '<div class="mobile-blacklist-card" data-id="' + html(id) + '" data-ip="' + html(ip) + '">' +
                '<div class="mobile-blacklist-head">' +
                '<div class="mobile-blacklist-ip">' + html(ip || '未知IP') + '</div>' +
                '<button type="button" class="mobile-blacklist-unban">解除封禁</button>' +
                '</div>' +
                '<div class="mobile-blacklist-meta">' +
                '<div>客户/备注：' + html(name || reason || '无') + '</div>' +
                '<div>地区：' + html(region || '未知') + '</div>' +
                '<div>封禁时间：' + html(formatTime(time)) + '</div>' +
                '</div>' +
                '</div>';
        });
        $list.html(output);
    }

    function formatTime(value) {
        if (!value) {
            return '未知';
        }
        if (/^\d+$/.test(String(value))) {
            var number = parseInt(value, 10);
            if (number > 0 && number < 2000000000) {
                return new Date(number * 1000).toLocaleString();
            }
        }
        return value;
    }

    function loadBlacklist() {
        var keyword = $.trim($('#MobileBlacklistSearch').val());
        $('#MobileBlacklistList').html('<div class="mobile-blacklist-empty">正在加载黑名单...</div>');

        $.ajax({
            url: rootUrl('/admin/qrchannel/blacklist'),
            type: 'get',
            dataType: 'json',
            data: {
                page: 1,
                limit: 50,
                ip: keyword
            },
            success: function (res) {
                blacklistLoaded = true;
                renderBlacklist(normalizeList(res));
            },
            error: function () {
                $('#MobileBlacklistList').html('<div class="mobile-blacklist-empty">黑名单接口加载失败</div>');
            }
        });
    }

    function unban($card) {
        $.ajax({
            url: rootUrl('/admin/qrchannel/unbanIp'),
            type: 'post',
            dataType: 'json',
            data: {
                id: $card.attr('data-id'),
                ip: $card.attr('data-ip')
            },
            success: function (res) {
                if (res && res.code == 0) {
                    $card.fadeOut(160, function () {
                        $(this).remove();
                        if (!$('.mobile-blacklist-card').length) {
                            loadBlacklist();
                        }
                    });
                    if (window.layer) {
                        layer.msg(res.msg || '已解除封禁');
                    }
                } else if (window.layer) {
                    layer.msg((res && res.msg) || '解除封禁失败');
                }
            },
            error: function () {
                if (window.layer) {
                    layer.msg('解除封禁接口异常');
                }
            }
        });
    }

    function openActions() {
        $('.mobile-action-mask, .mobile-action-sheet').show();
    }

    function closeActions() {
        $('.mobile-action-mask, .mobile-action-sheet').hide();
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        var input = $('<input>');
        $('body').append(input);
        input.val(text).select();
        document.execCommand('copy');
        input.remove();
        return {
            then: function (callback) {
                callback();
            }
        };
    }

    function handleAction(action) {
        if (action === 'cancel') {
            closeActions();
            return;
        }

        if (action === 'copy-link') {
            var link = (window.MOBILE_WORKBENCH_CONFIG && window.MOBILE_WORKBENCH_CONFIG.receptionLink) || '';
            copyText(link).then(function () {
                if (window.layer) {
                    layer.msg('接待链接已复制');
                }
            });
        } else if (action === 'qrcode') {
            if (window.layer) {
                layer.msg('二维码模板接口待对接');
            }
        } else if (action === 'new-chat') {
            if (window.layer) {
                layer.msg('新建会话入口待对接');
            }
        }
        closeActions();
    }

    $(function () {
        $('.mobile-workbench-tab').on('click', function () {
            showTab($(this).attr('data-tab'));
        });

        $('.mobile-workbench-plus').on('click', openActions);
        $('.mobile-action-mask').on('click', closeActions);
        $('.mobile-action-sheet').on('click', 'button', function () {
            handleAction($(this).attr('data-action'));
        });

        $('#MobileBlacklistSearchBtn').on('click', loadBlacklist);
        $('#MobileBlacklistSearch').on('keypress', function (e) {
            if (e.keyCode === 13) {
                loadBlacklist();
            }
        });
        $('#MobileBlacklistList').on('click', '.mobile-blacklist-unban', function () {
            unban($(this).closest('.mobile-blacklist-card'));
        });

        $('.mobile-mine-action').on('click', function () {
            if (window.layer) {
                layer.msg('资料修改入口待对接');
            }
        });

        if (!blacklistLoaded && $('.mobile-workbench-tab[data-tab="blacklist"]').hasClass('is-active')) {
            loadBlacklist();
        }
    });
})(jQuery);
