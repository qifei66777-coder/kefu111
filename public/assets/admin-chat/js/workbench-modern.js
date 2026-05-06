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
    // 选中访客后，移动端自动关闭抽屉，让聊天可见
    if (isMobile()) wbCloseDrawers();
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
  // 移动端默认是聊天页（不加 class）；wb-mb-list 显示列表抽屉，wb-mb-side 显示资料抽屉
  function wbMobileShow(view) {
    if (!isMobile()) return;
    var $b = $('body');
    $b.removeClass('wb-mb-list wb-mb-side');
    if (view === 'list') $b.addClass('wb-mb-list');
    else if (view === 'side') $b.addClass('wb-mb-side');
    // chat 是默认态：不加 class
  }

  function wbCloseDrawers() {
    $('body').removeClass('wb-mb-list wb-mb-side');
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

    // —— 移动端：选中会话进入聊天（默认就是聊天，关掉列表抽屉即可） ——
    $(document).on('click', '#chat_list .visit_content, #wait_list .visiter', function () {
      if (isMobile()) wbCloseDrawers();
    });

    // —— 顶栏 "切换客户"：打开会话列表抽屉（手机） ——
    $(document).on('click', '#wb_chat_back', function () {
      wbMobileShow('list');
    });

    // —— 顶栏 "资料"：打开右侧资料抽屉（手机） ——
    $(document).on('click', '#wb_chat_info', function () {
      wbMobileShow('side');
    });

    // —— 资料抽屉关闭按钮 ——
    $(document).on('click', '#wb_side_close', function () {
      wbCloseDrawers();
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

    // —— Emoji 表情面板：Unicode 直插入 textarea ——
    // 委托到 .wl_faces_main，事件先在这里命中再冒到 body 的 tool_box 关闭逻辑
    $(document).on('click', '.wl_faces_main .wb-emoji-btn', function (e) {
      e.preventDefault();
      var ch = $(this).attr('data-emoji') || $(this).text();
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

    // —— 移动端首屏：未选中访客时主动打开列表抽屉，引导用户选择 ——
    if (isMobile()) {
      var hasCu = false;
      try {
        var cu = (typeof $.cookie === 'function') ? $.cookie('cu_com') : null;
        hasCu = !!(cu && cu.length > 4);
      } catch (e) { hasCu = false; }
      if (!hasCu) {
        setTimeout(function () { wbMobileShow('list'); }, 300);
      }
    }
  });
})(window.jQuery);
