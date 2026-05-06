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

  // ===== 移动端视图切换 =====
  function wbMobileShow(view) {
    if (!isMobile()) return;
    var $b = $('body');
    $b.removeClass('wb-mb-list wb-mb-chat wb-mb-side');
    if (view === 'chat') $b.addClass('wb-mb-chat');
    else if (view === 'side') $b.addClass('wb-mb-side');
    // list 是默认态：不加 class
  }

  $(window).on('resize', function () {
    wbListHeight();
    if (!isMobile()) {
      $('body').removeClass('wb-mb-list wb-mb-chat wb-mb-side');
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

    // —— Rail 跳转/快捷回复 ——
    $(document).on('click', '.wb-rail-item[data-wb-rail="reply"]', function () {
      if (isMobile()) wbMobileShow('side');
      var $scroll = $('.wb-card-reply .wb-reply-bd');
      if ($scroll.length) $scroll.animate({ scrollTop: 0 }, 200);
    });

    $(document).on('click', '.wb-rail-item[data-wb-rail="chat"]', function () {
      if (isMobile()) wbMobileShow('list');
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

    // —— 移动端：选中会话进入聊天 ——
    $(document).on('click', '#chat_list .visit_content', function () {
      if (isMobile()) wbMobileShow('chat');
    });

    // —— 聊天头部：返回会话列表（仅手机） ——
    $(document).on('click', '#wb_chat_back', function () {
      wbMobileShow('list');
    });

    // —— 聊天头部：打开右侧资料（仅手机） ——
    $(document).on('click', '#wb_chat_info', function () {
      wbMobileShow('side');
    });

    // —— 资料抽屉关闭按钮（仅手机） ——
    $(document).on('click', '#wb_side_close', function () {
      wbMobileShow('chat');
    });

    // —— 列表/计数同步 ——
    var obsTimer;
    $(document).ajaxComplete(function () {
      clearTimeout(obsTimer);
      obsTimer = setTimeout(function () {
        wbSyncFilterCounts();
        var mode = $('.wb-list-filters .wb-pill.is-active').data('wb-filter');
        if (mode && mode !== 'queue') {
          wbApplyListFilter(mode === 'all' ? 'all' : mode);
        }
      }, 50);
    });
  });
})(window.jQuery);
