/**
 * 客服工作台布局辅助：列表筛选、侧栏滚动、高度同步、移动端抽屉、Rail 折叠
 * 仅 UI 层；不修改 WebSocket / Pusher / send 主逻辑。
 */
(function ($) {
  'use strict';

  var MOBILE_BP = 900;

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: ' + MOBILE_BP + 'px)').matches;
  }

  function wbListHeight() {
    var $container = $('#container');
    var h = $container.height() || $(window).height();
    if (h < 320) {
      h = 320;
    }
    var headH = $('.wb-list-head').outerHeight() || 0;
    var filtH = $('.wb-list-filters').outerHeight() || 0;
    var toolsH = $('.wb-list-tools:visible').outerHeight() || 0;
    var rail = isMobile() ? ($('.wb-rail').outerHeight() || 0) : 0;
    var inner = h - headH - filtH - toolsH - rail - 6;
    if (inner < 200) inner = 200;
    $('#chat_list').css('height', inner + 'px');
    $('#wait_list').css('height', inner + 'px');
  }

  // 暴露给老 chat.js 在选中访客后回填头部
  window.wbVisiterHead = function (data) {
    if (!data) {
      return;
    }
    var name = data.name || data.visiter_name || $('#customer').text() || '访客';
    $('#wb_chat_title').text(name);
    var dev = data.device_type || $('#v_device_type').text() || '—';
    var ip = data.ip || $('.ipdizhi').first().text() || '—';
    var reg = data.ip_region || $('#v_ip_region').text() || '—';
    var $meta = $('#wb_chat_meta_line');
    $meta.empty();
    if (dev && dev !== '—') $meta.append('<span class="wb-chip wb-chip-' + (/iOS/i.test(dev) ? 'ios' : (/Android/i.test(dev) ? 'android' : 'pc')) + '">' + dev + '</span>');
    if (ip && ip !== '—') $meta.append('<span class="wb-chip">' + ip + '</span>');
    if (reg && reg !== '—') $meta.append('<span class="wb-chip wb-chip-loc">' + reg + '</span>');
    if (!$meta.children().length) $meta.text('设备与 IP 信息将在选中访客后显示');
    if (isMobile()) wbOpenMobileChat();
  };

  function wbApplyListFilter(mode) {
    var $items = $('#chat_list .visiter');
    if (mode === 'queue') {
      return;
    }
    $items.each(function () {
      var $el = $(this);
      var unread = parseInt($el.attr('data-wb-unread') || '0', 10) || 0;
      var st = $el.attr('data-wb-state') || '';
      var show = true;
      if (mode === 'unread') {
        show = unread > 0;
      } else if (mode === 'ended') {
        show = st === 'offline';
      } else {
        show = true;
      }
      $el.toggle(show);
    });
  }

  function wbSyncFilterCounts() {
    var total = $('#chat_list .visiter').length;
    var unread = $('#chat_list .visiter').filter(function () {
      return (parseInt($(this).attr('data-wb-unread') || '0', 10) || 0) > 0;
    }).length;
    var ended = $('#chat_list .visiter').filter(function () {
      return $(this).attr('data-wb-state') === 'offline';
    }).length;
    var qn = parseInt($('#waitnum').text() || '0', 10) || 0;
    $('#wb-count-all').text('(' + total + ')');
    $('#wb-count-unread').text('(' + unread + ')');
    $('#wb-count-queue').text('(' + qn + ')');
    $('#wb-count-ended').text('(' + ended + ')');
  }

  function wbSwitchQueue(showQueue) {
    $('#chat_list').removeClass('layui-show');
    $('#wait_list').removeClass('layui-show');
    if (showQueue) {
      $('#wait_list').addClass('layui-show');
    } else {
      $('#chat_list').addClass('layui-show');
    }
    wbListHeight();
  }

  // ===== 图片灯箱 =====
  function wbOpenImage(src) {
    $('.wb-img-modal').remove();
    var $bd = $('<div class="wb-img-modal"></div>');
    var $close = $('<button type="button" class="wb-img-modal-close" aria-label="关闭">×</button>');
    var $img = $('<img alt="图片预览" />').attr('src', src);
    $bd.append($img).append($close);
    $bd.on('click', function (ev) {
      if (ev.target === $bd[0] || ev.target === $close[0]) {
        $bd.remove();
      }
    });
    $('body').append($bd);
  }
  window.wbOpenImage = wbOpenImage;

  // ===== 移动端视图切换 =====
  function wbMobileShow(view) {
    if (!isMobile()) return;
    var $b = $('body');
    $b.removeClass('wb-mb-list wb-mb-side wb-mobile-tab-chat wb-mobile-tab-blacklist wb-mobile-tab-mine');
    if (view === 'blacklist') {
      $b.addClass('wb-mobile-tab-blacklist').removeClass('wb-mb-chat-open');
      wbLoadMobileBlacklist();
    } else if (view === 'mine') {
      $b.addClass('wb-mobile-tab-mine').removeClass('wb-mb-chat-open');
    } else {
      $b.addClass('wb-mobile-tab-chat').removeClass('wb-mb-chat-open');
    }
    $('.wb-mobile-tabs [data-wb-mobile-tab="' + (view || 'chat') + '"]').addClass('is-active').siblings().removeClass('is-active');
  }

  function wbCloseDrawers() {
    $('body').removeClass('wb-mb-list wb-mb-side');
  }

  function wbOpenMobileChat() {
    if (!isMobile()) return;
    $('body').addClass('wb-mobile-tab-chat wb-mb-chat-open').removeClass('wb-mobile-tab-blacklist wb-mobile-tab-mine wb-mb-list wb-mb-side');
    $('.wb-mobile-tabs [data-wb-mobile-tab="chat"]').addClass('is-active').siblings().removeClass('is-active');
  }

  // 同步顶栏"切换客户"按钮上的未读数量徽章
  function wbSyncBackBadge() {
    if (!isMobile()) return;
    var total = 0;
    $('#chat_list .visiter').each(function () {
      var n = parseInt($(this).attr('data-wb-unread') || '0', 10) || 0;
      total += n;
    });
    var $badge = $('#wb_back_badge');
    if (!$badge.length) return;
    if (total > 0) {
      $badge.text(total > 99 ? '99+' : total).removeClass('hide');
    } else {
      $badge.text('').addClass('hide');
    }
  }

  $(window).on('resize', function () {
    wbListHeight();
    if (!isMobile()) {
      $('body').removeClass('wb-mb-list wb-mb-side');
    } else {
      wbSyncBackBadge();
    }
  });

  window.wbSyncChatListHeight = wbListHeight;
  window.wbMobileShow = wbMobileShow;

  function wbHtml(s) {
    return $('<div/>').text(s == null ? '' : String(s)).html();
  }

  function wbCopyText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        layer.msg('已复制接待链接');
      }).catch(function () {
        window.prompt('复制以下链接：', text);
      });
    } else {
      window.prompt('复制以下链接：', text);
    }
  }

  function wbLoadMobileBlacklist() {
    var $box = $('#wb_mobile_black_list');
    if (!$box.length) return;
    $box.html('<div class="wb-mobile-empty">正在加载黑名单...</div>');
    $.ajax({
      url: (window.YMWL_ROOT_URL || '') + '/admin/qrchannel/blacklist',
      type: 'get',
      dataType: 'json',
      data: { page: 1, limit: 100, ip: $('#wb_mobile_black_kw').val() || '' },
      success: function (res) {
        var rows = res && res.data ? res.data : [];
        if (!rows.length) {
          $box.html('<div class="wb-mobile-empty">暂无黑名单数据</div>');
          return;
        }
        var html = '';
        $.each(rows, function (_, row) {
          var name = row.service_nickname || row.service_name || row.created_by_name || '客户';
          html += '<div class="wb-mobile-black-item" data-ip="' + wbHtml(row.ip) + '" data-id="' + wbHtml(row.id) + '">';
          html += '<div><div class="wb-mobile-black-ip">' + wbHtml(row.ip || '-') + '</div>';
          html += '<div class="wb-mobile-black-meta">客户名：' + wbHtml(name) + '<br>封禁时间：' + wbHtml(row.created_at || '-') + '</div></div>';
          html += '<button type="button" class="wb-mobile-unban">解除封禁</button></div>';
        });
        $box.html(html);
      },
      error: function () {
        $box.html('<div class="wb-mobile-empty">黑名单接口不可用，请稍后重试</div>');
      }
    });
  }

  function wbCloseMobileActions() {
    $('body').removeClass('wb-mobile-actions-open');
    $('#wb_mobile_action_sheet').attr('aria-hidden', 'true');
  }

  $(function () {
    if ($('body').hasClass('wb-modern')) {
      $('#layout-center').css({ left: 0, width: '100%' });
    }
    wbListHeight();

    // —— 列表筛选 pills ——
    $(document).on('click', '.wb-list-filters .wb-pill', function () {
      var $btn = $(this);
      $btn.addClass('is-active').siblings('.wb-pill').removeClass('is-active');
      var mode = $btn.data('wb-filter') || 'all';
      if (mode === 'queue') {
        wbSwitchQueue(true);
        wbApplyListFilter('all');
      } else {
        wbSwitchQueue(false);
        wbApplyListFilter(mode === 'all' ? 'all' : mode);
      }
    });

    // —— Rail 跳转/快捷回复（rail 在移动端隐藏，不会触发 mobile 分支） ——
    $(document).on('click', '.wb-rail-item[data-wb-rail="reply"]', function () {
      var $scroll = $('.wb-card-reply .wb-reply-bd');
      if ($scroll.length) $scroll.animate({ scrollTop: 0 }, 200);
    });

    // —— Rail 折叠（仅桌面） ——
    $(document).on('click', '.wb-rail-collapse', function () {
      if (isMobile()) return;
      $('body').toggleClass('wb-rail-collapsed');
      try { localStorage.setItem('wb_rail_collapsed', $('body').hasClass('wb-rail-collapsed') ? '1' : '0'); } catch (e) {}
      wbListHeight();
    });
    try {
      if (!isMobile() && localStorage.getItem('wb_rail_collapsed') === '1') {
        $('body').addClass('wb-rail-collapsed');
      }
    } catch (e) {}

    // —— 封禁 IP 复用 ——
    $(document).on('click', '#wb_header_ban_ip, #wb_side_ban_ip', function () {
      $('#btn_visitor_ban_ip').trigger('click');
    });

    // —— 文件/图片/视频快捷触发（保留向后兼容） ——
    $(document).on('click', '#wb_trig_picture', function (e) {
      e.preventDefault();
      $('#picture input[type=file]').trigger('click');
    });
    $(document).on('click', '#wb_trig_file', function (e) {
      e.preventDefault();
      $('#file input[type=file]').trigger('click');
    });
    $(document).on('click', '#wb_trig_video', function (e) {
      e.preventDefault();
      if (typeof window.getvideo === 'function') window.getvideo();
    });

    // —— 移动端：选中会话进入聊天窗口 ——
    $(document).on('click', '#chat_list .visit_content, #wait_list .visiter', function () {
      if (isMobile()) wbOpenMobileChat();
    });

    // —— 聊天窗口返回会话列表 ——
    $(document).on('click', '#wb_chat_back', function () {
      if (isMobile()) {
        $('body').removeClass('wb-mb-chat-open');
      } else {
        wbMobileShow('list');
      }
    });

    // —— 顶栏 "资料"：打开右侧资料抽屉（手机） ——
    $(document).on('click', '#wb_chat_info', function () {
      wbMobileShow('side');
    });

    // —— 资料抽屉关闭按钮 ——
    $(document).on('click', '#wb_side_close', function () {
      wbCloseDrawers();
    });

    // —— 移动底部 Tab ——
    $(document).on('click', '.wb-mobile-tabs [data-wb-mobile-tab]', function () {
      wbCloseMobileActions();
      wbMobileShow($(this).data('wb-mobile-tab') || 'chat');
    });

    $(document).on('click', '#wb_mobile_plus', function (e) {
      e.preventDefault();
      e.stopPropagation();
      $('body').toggleClass('wb-mobile-actions-open');
      $('#wb_mobile_action_sheet').attr('aria-hidden', $('body').hasClass('wb-mobile-actions-open') ? 'false' : 'true');
    });

    $(document).on('click', '#wb_mobile_action_mask', function () {
      wbCloseMobileActions();
    });

    $(document).on('click', '[data-wb-mobile-action]', function () {
      var action = $(this).data('wb-mobile-action');
      wbCloseMobileActions();
      if (action === 'qr') {
        if (typeof window.openQrChannel === 'function') window.openQrChannel();
      } else if (action === 'copy') {
        $.ajax({
          url: (window.YMWL_ROOT_URL || '') + '/admin/qrchannel/create',
          type: 'post',
          dataType: 'json',
          data: { template_id: 0, remark: '' },
          success: function (res) {
            if (res && res.code === 0 && res.data && res.data.url) {
              wbCopyText(res.data.url);
            } else {
              layer.msg((res && res.msg) || '生成接待链接失败', { icon: 2 });
            }
          },
          error: function () {
            layer.msg('生成接待链接失败', { icon: 2 });
          }
        });
      } else if (action === 'new') {
        wbMobileShow('chat');
        $('body').removeClass('wb-mb-chat-open');
      }
    });

    $(document).on('input', '#wb_mobile_black_kw', function () {
      clearTimeout($(this).data('timer'));
      var el = this;
      $(this).data('timer', setTimeout(function () {
        wbLoadMobileBlacklist();
      }, 260));
    });

    $(document).on('click', '.wb-mobile-unban', function () {
      var $item = $(this).closest('.wb-mobile-black-item');
      $.ajax({
        url: (window.YMWL_ROOT_URL || '') + '/admin/qrchannel/unbanIp',
        type: 'post',
        dataType: 'json',
        data: { id: $item.data('id'), ip: $item.data('ip') },
        success: function (res) {
          if (res && res.code === 0) {
            layer.msg('已解除封禁', { icon: 1 });
            wbLoadMobileBlacklist();
          } else {
            layer.msg((res && res.msg) || '解除失败', { icon: 2 });
          }
        },
        error: function () {
          layer.msg('解除失败', { icon: 2 });
        }
      });
    });

    $(document).on('click', '#wb_mobile_edit_profile', function () {
      var $link = $('.am-dropdown-content a[href^="javascript:showinfo"]').first();
      if ($link.length) $link[0].click();
    });

    $(document).on('click', '#wb_mobile_change_pwd', function () {
      var $link = $('.am-dropdown-content a[href^="javascript:modify"]').first();
      if ($link.length) $link[0].click();
    });

    // —— 点击抽屉遮罩关闭抽屉 ——
    $(document).on('click', function (e) {
      if (!isMobile()) return;
      var $b = $('body');
      if (!$b.hasClass('wb-mb-list') && !$b.hasClass('wb-mb-side')) return;
      var t = e.target;
      if (!t) return;
      // 点击的元素如果在抽屉里或在抽屉触发按钮上，都不处理
      var insideDrawer = $(t).closest('.wb-pane-list, .wb-pane-side, #wb_chat_back, #wb_chat_info, #wb_side_close').length > 0;
      if (insideDrawer) return;
      // 仅当点击的就是 body（::after 遮罩 hit 到 body 上）才关闭
      if (t === document.body) {
        wbCloseDrawers();
      }
    });

    // —— 图片消息点击放大（不影响表情/头像） ——
    $(document).on('click', '.wb-root .conversation .outer-left .customer img, .wb-root .conversation .outer-right .service img', function (e) {
      var src = this.getAttribute('src') || '';
      if (!src) return;
      if (/\/emoji\//.test(src)) return; // 表情不放大
      if ($(this).hasClass('my-circle') || $(this).hasClass('se_pic') || $(this).hasClass('cu_pic')) return;
      e.preventDefault();
      e.stopPropagation();
      wbOpenImage(src);
    });

    // ESC 关闭图片
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        $('.wb-img-modal').remove();
      }
    });

    // —— 列表/计数同步 ——
    var obsTimer;
    $(document).ajaxComplete(function () {
      clearTimeout(obsTimer);
      obsTimer = setTimeout(function () {
        wbSyncFilterCounts();
        wbSyncBackBadge();
        var mode = $('.wb-list-filters .wb-pill.is-active').data('wb-filter');
        if (mode && mode !== 'queue') {
          wbApplyListFilter(mode === 'all' ? 'all' : mode);
        }
      }, 50);
    });

    // —— Emoji 表情面板：插入 face[...] 标记，发送时转 HTML 实体，避免 utf8 库无法存 4 字节 emoji ——
    var WB_EMOJI_NAMES = [
      '你好', '微笑', '偷笑', '大笑', '亲亲', '帅气', '问号', '害羞',
      '亲亲', '色色', '高兴', '微笑', '敲你', '问号', '我晕', '大哭',
      '惊讶', '发怒', '敲你', '鄙视', '害羞', '可怜', '阴险', '惊讶',
      '点赞', '鄙视', '鼓掌', '祈祷', '加油', '爱心', '火', '满分'
    ];
    // 委托到 .wl_faces_main，事件先在这里命中再冒到 body 的 tool_box 关闭逻辑
    $(document).on('click', '.wl_faces_main .wb-emoji-btn', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var idx = $('.wl_faces_main .wb-emoji-btn').index(this);
      var name = WB_EMOJI_NAMES[idx] || '微笑';
      var ch = ' face[' + name + ']';
      var ti = document.getElementById('text_in');
      if (!ti || !ch) return;
      // textarea / contenteditable 都兜一下
      if (typeof ti.value !== 'undefined') {
        var start = ti.selectionStart;
        var end = ti.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number') {
          ti.value = ti.value.substring(0, start) + ch + ti.value.substring(end);
          ti.selectionStart = ti.selectionEnd = start + ch.length;
        } else {
          ti.value = (ti.value || '') + ch;
        }
      } else {
        ti.textContent = (ti.textContent || '') + ch;
      }
      try { ti.focus(); } catch (err) {}
      // 触发 input 事件，兼容部分库的字数统计
      try {
        var ev = document.createEvent('Event');
        ev.initEvent('input', true, true);
        ti.dispatchEvent(ev);
      } catch (err) {}
    });

    // —— WebSocket 断开时的轻量轮询兜底（不替代 Pusher，连接正常时不工作） ——
    function wbCurrentVisitor() {
      try {
        var raw = (typeof $.cookie === 'function') ? $.cookie('cu_com') : '';
        return raw ? $.parseJSON(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function wbMessageHtml(v, avatar) {
      var cid = v && v.cid ? String(v.cid) : '';
      if (!cid || $('#cu_' + cid).length) return '';
      var content = v.content || '';
      var ct;
      if (typeof content === 'string' && content.indexOf('wolive-rich-reply') !== -1) {
        ct = '<div class="chat-msg-rich-wrap">' + content + '</div>';
      } else {
        ct = '<pre>' + content + '</pre>';
      }
      var html = '<li class="chatmsg" id="cu_' + cid + '"><div class="showtime"></div>';
      html += '<div class="" style="position: absolute;left:0;">';
      html += '<img class="my-circle se_pic" src="' + (avatar || v.avatar || '') + '" ></div>';
      html += "<div class='outer-left'><div class='customer'>";
      html += ct;
      html += '</div></div></li>';
      return html;
    }

    function wbFallbackPoll() {
      if (window.woliveRealtimeConnected === true) return;
      var cur = wbCurrentVisitor();
      if (!cur || !cur.visiter_id) return;
      if (!$('.chatbox').length || $('.chatbox').hasClass('hide')) return;
      $.ajax({
        url: (window.YMWL_ROOT_URL || '') + '/admin/set/chatdata',
        type: 'post',
        dataType: 'json',
        data: { visiter_id: cur.visiter_id, hid: '' },
        success: function (res) {
          if (!res || res.code !== 0 || !res.data || !res.data.length) return;
          var html = '';
          $.each(res.data, function (_, v) {
            if (!v || v.direction !== 'to_service') return;
            html += wbMessageHtml(v, cur.avatar || cur.avater || '');
          });
          if (!html) return;
          $('.conversation').append(html);
          if (typeof window.getwatch === 'function') {
            window.getwatch(cur.visiter_id);
          }
          var wrap = document.getElementById('wrap');
          if (wrap) {
            setTimeout(function () { wrap.scrollTop = wrap.scrollHeight; }, 40);
          }
          setTimeout(function () { $('.chatmsg').css({ height: 'auto' }); }, 80);
          if (typeof window.getchat === 'function') {
            window.getchat();
          }
        }
      });
    }

    window.setInterval(wbFallbackPoll, 4000);
    window.setInterval(function () {
      if (window.woliveRealtimeConnected === true) return;
      if (typeof window.getchat === 'function') window.getchat();
      if (typeof window.getwait === 'function') window.getwait();
    }, 8000);

    // —— 移动端首屏：默认显示会话列表 ——
    if (isMobile()) {
      wbMobileShow('chat');
    }
  });
})(window.jQuery);
