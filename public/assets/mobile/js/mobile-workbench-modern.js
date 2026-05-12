(function ($) {
    'use strict';

    var blacklistLoaded = false;
    var qrPanelOpen = false;

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

        $('#MobileQrPanel').removeClass('is-overlay-active');
        qrPanelOpen = false;

        if (tab === 'blacklist') {
            $('#MobileBlacklistPanel').addClass('is-overlay-active');
            $('.mobile-workbench-plus').hide();
            loadBlacklist();
        } else {
            $('#MobileBlacklistPanel').removeClass('is-overlay-active');
            if (tab === 'chat') {
                try { window.chatSwiper.slideTo(0, 0); } catch (e) {}
                $('.mobile-workbench-plus').show();
            } else if (tab === 'my') {
                try { window.chatSwiper.slideTo($('.swiper-slide').length - 1, 0); } catch (e) {}
                $('.mobile-workbench-plus').hide();
            }
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

    var THEME_LABELS = { blue: '蓝色', green: '绿色', purple: '紫色', orange: '橙色', red: '红色' };

    function buildPosterHtml(url, remark, oneToOne, theme) {
        theme = theme || 'blue';
        return '<div class="qr-poster theme-' + theme + '">'
            + '<div class="qr-poster__bg"></div>'
            + '<span class="qr-poster__deco-star">✦</span>'
            + '<span class="qr-poster__deco-star">✦</span>'
            + '<span class="qr-poster__deco-star">✦</span>'
            + '<span class="qr-poster__deco-dots">💬</span>'
            + '<div class="qr-poster__body">'
            + '<h2 class="qr-poster__title">在线咨询</h2>'
            + '<p class="qr-poster__subtitle">— 欢迎咨询在线客服 —</p>'
            + '<div class="qr-poster__badge">服务时间：全天24小时</div>'
            + '<div class="qr-poster__qr-card"><div id="mqr-canvas-host"></div></div>'
            + '<div class="qr-poster__remark">' + html(remark) + '</div>'
            + (oneToOne ? '<div class="qr-poster__one-tag">一客户一码 · 仅首次扫码者可用</div>' : '')
            + '<div class="qr-poster__url">' + html(url) + '</div>'
            + '<div class="qr-poster__footer"><div class="qr-poster__avatar">👩‍💼</div></div>'
            + '<button id="mqr-copy-btn" type="button" class="qr-poster__copy-btn">复制链接</button>'
            + '</div>'
            + '</div>';
    }

    function showChannelResult(url, remark, oneToOne, theme) {
        var isMobile = window.innerWidth <= 768;
        var qrSize = isMobile ? 160 : 200;
        var contentHtml = buildPosterHtml(url, remark, oneToOne, theme);
        layer.open({
            type: 1,
            title: false,
            closeBtn: 1,
            area: [isMobile ? '92%' : '380px', 'auto'],
            content: contentHtml,
            success: function () {
                if (typeof AraleQRCode !== 'undefined') {
                    var host = document.getElementById('mqr-canvas-host');
                    if (host) {
                        try {
                            host.appendChild(new AraleQRCode({ render: 'canvas', text: url, size: qrSize, background: '#fff', foreground: '#000' }));
                        } catch (e) {
                            host.innerHTML = '<div style="color:#94a3b8;font-size:12px;">二维码生成失败，请使用链接</div>';
                        }
                    }
                }
                $(document).off('click.mqr').on('click.mqr', '#mqr-copy-btn', function () {
                    copyText(url).then(function () { layer.msg('已复制'); });
                });
            }
        });
    }

    function buildThemeSelector() {
        var themes = ['blue', 'green', 'purple', 'orange', 'red'];
        var s = '<label style="display:block;font-size:13px;color:#0f172a;margin-bottom:6px;margin-top:14px;">海报主题</label>'
            + '<div class="qp-theme-selector" id="mWbThemeSelector">';
        for (var i = 0; i < themes.length; i++) {
            var t = themes[i];
            s += '<div class="qp-theme-option' + (i === 0 ? ' is-selected' : '') + '" data-theme="' + t + '">'
                + '<div class="qp-theme-option__swatch"></div>'
                + '<span class="qp-theme-option__label">' + THEME_LABELS[t] + '</span>'
                + '</div>';
        }
        s += '</div>';
        return s;
    }

    function openChannelCreator(mode) {
        if (!window.layer) return;
        var content = '<div style="padding:16px 16px 4px;">'
            + '<label style="display:block;font-size:13px;color:#0f172a;margin-bottom:6px;">客户名称 <span style="color:#dc2626;">*</span></label>'
            + '<input id="mWbChRemark" type="text" placeholder="将显示为该客户名字" maxlength="100" '
            + 'style="width:100%;padding:11px 12px;border:1px solid #e0e6ee;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none;">'
            + '<div style="margin-top:14px;display:flex;align-items:center;gap:8px;">'
            + '<input id="mWbChOne" type="checkbox" style="width:16px;height:16px;">'
            + '<label for="mWbChOne" style="font-size:13px;color:#374151;">一客户一码（仅首次扫码者可用）</label>'
            + '</div>'
            + buildThemeSelector()
            + '<div style="margin-top:8px;font-size:11px;color:#94a3b8;">备注名即扫码客户的名字，建议填写客户真实姓名</div>'
            + '</div>';
        layer.open({
            type: 1,
            title: mode === 'link' ? '生成接待链接' : '生成接待二维码',
            area: ['88%', 'auto'],
            content: content,
            btn: ['生成', '取消'],
            yes: function (idx) {
                var remark = $.trim($('#mWbChRemark').val());
                if (!remark) {
                    layer.msg('请填写客户名称');
                    return false;
                }
                var oneToOne = $('#mWbChOne').prop('checked') ? 1 : 0;
                var theme = $('#mWbThemeSelector .qp-theme-option.is-selected').attr('data-theme') || 'blue';
                $.ajax({
                    url: rootUrl('/admin/qrchannel/create'),
                    type: 'post',
                    dataType: 'json',
                    data: { remark: remark, template_id: 0, one_to_one: oneToOne, poster_theme: theme },
                    success: function (res) {
                        if (!res || res.code !== 0) {
                            layer.msg((res && res.msg) ? res.msg : '生成失败');
                            return;
                        }
                        layer.close(idx);
                        var url = res.data && res.data.url ? res.data.url : '';
                        if (!url) {
                            layer.msg('链接生成异常');
                            return;
                        }
                        if (qrPanelOpen) {
                            loadQrChannels();
                        }
                        if (mode === 'link') {
                            copyText(url).then(function () { layer.msg('链接已复制：' + remark); });
                        } else {
                            showChannelResult(url, remark, oneToOne, theme);
                        }
                    },
                    error: function () { layer.msg('网络错误'); }
                });
                return false;
            }
        });
        setTimeout(function () { $('#mWbChRemark').focus(); }, 80);
        $(document).off('click.qptheme').on('click.qptheme', '.qp-theme-option', function () {
            $('.qp-theme-option').removeClass('is-selected');
            $(this).addClass('is-selected');
        });
    }

    function showQrPanel() {
        qrPanelOpen = true;
        $('#MobileQrPanel').addClass('is-overlay-active');
        $('.mobile-workbench-plus').hide();
        loadQrChannels();
    }

    function hideQrPanel() {
        qrPanelOpen = false;
        $('#MobileQrPanel').removeClass('is-overlay-active');
        var activeTab = $('.mobile-workbench-tab.is-active').attr('data-tab');
        if (activeTab === 'chat') {
            $('.mobile-workbench-plus').show();
        }
    }

    function loadQrChannels() {
        var $list = $('#MobileQrList');
        $list.html('<div class="mobile-qr-empty">正在加载...</div>');
        $.ajax({
            url: rootUrl('/admin/qrchannel/channelList'),
            type: 'get',
            dataType: 'json',
            data: { page: 1, limit: 100 },
            success: function (res) {
                var rows = (res && res.data) ? res.data : [];
                renderQrChannels(rows);
            },
            error: function () {
                $list.html('<div class="mobile-qr-empty">加载失败，请稍后重试</div>');
            }
        });
    }

    function renderQrChannels(rows) {
        var $list = $('#MobileQrList');
        if (!rows || !rows.length) {
            $list.html('<div class="mobile-qr-empty">暂无二维码渠道</div>');
            return;
        }
        var output = '';
        $.each(rows, function (_, item) {
            var name = item.remark || '未命名';
            var scanCount = item.scan_count || 0;
            var lastScan = item.last_scan_time || '';
            var createdAt = item.created_at || '';
            var url = item.qr_url || '';
            var status = item.status;
            var statusLabel, statusClass;
            if (status === 0 || status === '0') {
                statusLabel = '已禁用';
                statusClass = 'status-disabled';
            } else if (scanCount > 0) {
                statusLabel = '已使用';
                statusClass = 'status-used';
            } else {
                statusLabel = '未使用';
                statusClass = 'status-unused';
            }
            var posterTheme = item.poster_theme || 'blue';
            var themeLabel = THEME_LABELS[posterTheme] || '蓝色';
            var themeTagClass = 'tag-' + posterTheme;
            output += '<div class="mobile-qr-card" data-url="' + html(url) + '" data-remark="' + html(name) + '" data-one="' + (item.one_to_one || 0) + '" data-theme="' + html(posterTheme) + '">'
                + '<div class="mobile-qr-card-head">'
                + '<div class="mobile-qr-card-name">' + html(name) + '</div>'
                + '<span class="mobile-qr-card-status ' + statusClass + '">' + statusLabel + '</span>'
                + '</div>'
                + '<div class="mobile-qr-card-meta">'
                + '<div class="mobile-qr-card-meta-item">扫码 <strong>' + scanCount + '</strong> 次</div>'
                + '<div class="mobile-qr-card-meta-item">创建 <strong>' + html(createdAt ? createdAt.substring(0, 10) : '-') + '</strong></div>'
                + '<div class="mobile-qr-card-meta-item">模板 <span class="qr-theme-tag ' + themeTagClass + '">' + themeLabel + '</span></div>'
                + (item.one_to_one == 1 ? '<div class="mobile-qr-card-meta-item">模式 <strong>一客一码</strong></div>' : '')
                + '</div>'
                + '<div class="mobile-qr-card-actions">'
                + '<button type="button" class="mobile-qr-btn-view">查看二维码</button>'
                + '<button type="button" class="mobile-qr-btn-copy">复制链接</button>'
                + '</div>'
                + '</div>';
        });
        $list.html(output);
    }

    function handleAction(action) {
        if (action === 'cancel') {
            closeActions();
            return;
        }

        if (action === 'qrcode') {
            closeActions();
            openChannelCreator('qr');
        } else if (action === 'qr-manage') {
            closeActions();
            showQrPanel();
        } else {
            closeActions();
        }
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

    function openPasswordEditor() {
        if (!window.layer) {
            return;
        }
        var html = '<div style="padding:20px 16px 8px;">' +
            '<input id="MobileOldPass" type="password" placeholder="当前密码" ' +
            'style="width:100%;padding:10px 12px;border:1px solid #e0e0e0;border-radius:10px;font-size:15px;box-sizing:border-box;margin-bottom:10px;">' +
            '<input id="MobileNewPass" type="password" placeholder="新密码（至少6位）" ' +
            'style="width:100%;padding:10px 12px;border:1px solid #e0e0e0;border-radius:10px;font-size:15px;box-sizing:border-box;margin-bottom:10px;">' +
            '<input id="MobileNewPass2" type="password" placeholder="确认新密码" ' +
            'style="width:100%;padding:10px 12px;border:1px solid #e0e0e0;border-radius:10px;font-size:15px;box-sizing:border-box;">' +
            '</div>';
        layer.open({
            type: 1,
            title: '修改密码',
            area: ['88%', 'auto'],
            content: html,
            btn: ['保存', '取消'],
            yes: function (idx) {
                var oldPass = $('#MobileOldPass').val();
                var newPass = $('#MobileNewPass').val();
                var newPass2 = $('#MobileNewPass2').val();
                if (!oldPass) { layer.msg('请输入当前密码'); return; }
                if (!newPass || newPass.length < 6) { layer.msg('新密码至少6位'); return; }
                if (newPass !== newPass2) { layer.msg('两次输入的密码不一致'); return; }
                $.ajax({
                    url: rootUrl('/mobile/admin/selfUpdate'),
                    type: 'post',
                    dataType: 'json',
                    data: { action: 'password', old_password: oldPass, new_password: newPass },
                    success: function (res) {
                        layer.close(idx);
                        layer.msg(res.msg || (res.code === 0 ? '密码已更新' : '修改失败'));
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

    window.showTab = showTab;

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
            } else if (action === 'password') {
                openPasswordEditor();
            }
        });

        if (!blacklistLoaded && $('.mobile-workbench-tab[data-tab="blacklist"]').hasClass('is-active')) {
            loadBlacklist();
        }

        $('#MobileQrBack').on('click', function () {
            hideQrPanel();
        });

        $('#MobileQrCreate').on('click', function () {
            openChannelCreator('qr');
        });

        $('#MobileQrList').on('click', '.mobile-qr-btn-view', function () {
            var $card = $(this).closest('.mobile-qr-card');
            var url = $card.attr('data-url');
            var remark = $card.attr('data-remark');
            var oneToOne = parseInt($card.attr('data-one'), 10);
            var theme = $card.attr('data-theme') || 'blue';
            if (!url) {
                if (window.layer) layer.msg('该渠道链接为空');
                return;
            }
            showChannelResult(url, remark, oneToOne, theme);
        });

        $('#MobileQrList').on('click', '.mobile-qr-btn-copy', function () {
            var $card = $(this).closest('.mobile-qr-card');
            var url = $card.attr('data-url');
            if (!url) {
                if (window.layer) layer.msg('该渠道链接为空');
                return;
            }
            copyText(url).then(function () {
                if (window.layer) layer.msg('链接已复制');
            });
        });
    });
})(jQuery);
