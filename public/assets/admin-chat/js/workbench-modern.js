/**
 * 客服工作台布局辅助：列表筛选、侧栏滚动、高度同步、封禁按钮复用
 * 不修改 WebSocket / Pusher / send 主逻辑
 */
(function ($) {
  'use strict';

  function wbListHeight() {
    var h = $('#container').height() || $(window).height();
    if (h < 320) {
      h = 320;
    }
    var headH = $('.wb-list-head').outerHeight() || 0;
    var filtH = $('.wb-list-filters').outerHeight() || 0;
    var toolsH = $('.wb-list-tools').outerHeight() || 0;
    var inner = h - headH - filtH - toolsH - 6;
    $('#chat_list').css('height', inner + 'px');
    $('#wait_list').css('height', inner + 'px');
  }

  window.wbVisiterHead = function (data) {
    if (!data) {
      return;
    }
    var name = data.name || data.visiter_name || $('#customer').text() || '访客';
    $('#wb_chat_title').text(name);
    var dev = data.device_type || $('#v_device_type').text() || '—';
    var ip = data.ip || $('.ipdizhi').first().text() || '—';
    var reg = data.ip_region || $('#v_ip_region').text() || '—';
    var line = '设备：' + dev + '　IP：' + ip + '　地区：' + reg;
    $('#wb_chat_meta_line').text(line);
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

  $(window).on('resize', function () {
    wbListHeight();
  });

  window.wbSyncChatListHeight = wbListHeight;

  $(function () {
    if ($('body').hasClass('wb-modern')) {
      $('#layout-center').css({ left: 0, width: '100%' });
    }
    wbListHeight();

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

    $(document).on('click', '.wb-rail-item[data-wb-rail="reply"]', function () {
      var $scroll = $('.wb-card-reply .wb-reply-bd');
      if ($scroll.length) {
        $scroll.animate({ scrollTop: 0 }, 200);
      }
    });

    $(document).on('click', '#wb_header_ban_ip, #wb_side_ban_ip', function () {
      $('#btn_visitor_ban_ip').trigger('click');
    });

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
      if (typeof window.getvideo === 'function') {
        window.getvideo();
      }
    });

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
