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
            var link = (window.MOBILE_WORKBENCH_CONFIG && window.MOBILE_WORKBENCH_CONFIG.receptionLink) || '';
            if (link) {
                copyText(link).then(function () {
                    layer.msg('接待链接已复制，发送给访客即可开始会话');
                });
            }
        } else if (action === 'new-chat') {
            var link = (window.MOBILE_WORKBENCH_CONFIG && window.MOBILE_WORKBENCH_CONFIG.receptionLink) || '';
            if (link) {
                window.open(link, '_blank');
            }
        }
        closeActions();
    }

    function openNicknameEditor() {
        if (!window.layer) {
            return;
        }
        var html = '<div style="padding:20px 16px 8px;">' +
            '<input id="MobileNickInput" type="text" placeholder="输入新昵称（最多20字）" ' +
            'style="width:100%;padding:10px 12px;border:1px solid #e0e0e0;border-radius:10px;font-size:15px;box-sizing:border-box;">' +
            '</div>';
        layer.open({
            type: 1,
            title: '修改昵称',
            area: ['88%', 'auto'],
            content: html,
            btn: ['保存', '取消'],
            yes: function (idx) {
                var nick = $.trim($('#MobileNickInput').val());
                if (!nick) {
                    layer.msg('昵称不能为空');
                    return;
                }
                $.ajax({
                    url: rootUrl('/mobile/admin/selfUpdate'),
                    type: 'post',
                    dataType: 'json',
                    data: { action: 'nickname', nickname: nick },
                    success: function (res) {
                        layer.close(idx);
                        if (res.code === 0) {
                            layer.msg('昵称已更新');
                            $('.mobile-workbench-name').text(nick);
                        } else {
                            layer.msg(res.msg || '修改失败');
                        }
                    },
                    error: function () {
                        layer.msg('网络错误');
                    }
                });
            }
        });
    }

    function openAvatarUploader() {
        var $input = $('<input type="file" accept="image/*" style="display:none">');
        $('body').append($input);
        $input.on('change', function () {
            var file = this.files[0];
            if (!file) {
                $input.remove();
                return;
            }
            var fd = new FormData();
            fd.append('action', 'avatar');
            fd.append('avatar', file);
            $.ajax({
                url: rootUrl('/mobile/admin/selfUpdate'),
                type: 'post',
                data: fd,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function (res) {
                    if (res.code === 0) {
                        layer.msg('头像已更新');
                        $('.mobile-workbench-avatar').attr('src', res.data.avatar + '?t=' + Date.now());
                    } else {
                        layer.msg(res.msg || '上传失败');
                    }
                },
                error: function () {
                    layer.msg('上传失败');
                },
                complete: function () {
                    $input.remove();
                }
            });
        });
        $input.trigger('click');
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
            var action = $(this).attr('data-action');
            if (action === 'nickname') {
                openNicknameEditor();
            } else if (action === 'avatar') {
                openAvatarUploader();
            }
        });

        if (!blacklistLoaded && $('.mobile-workbench-tab[data-tab="blacklist"]').hasClass('is-active')) {
            loadBlacklist();
        }
    });
})(jQuery);
