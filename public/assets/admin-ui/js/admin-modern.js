/**
 * 总后台 SaaS 壳层：侧栏收起 class、全局搜索占位、隐藏危险扩展菜单项
 */
(function ($) {
  'use strict';

  function admHideRiskyMenuItems() {
    $('#group-menus-main').find('a[href*="Addons"],a[href*="addons"],a[href*="plugin"],a[href*="platform/index"],a[href*="cloud"],a[href*="update"],a[href*="Update"]')
      .closest('li').hide();
  }

  $(function () {
    admHideRiskyMenuItems();
    $('#layout-center').css({
      position: 'fixed',
      left: $('body').hasClass('adm-sidebar-collapsed') ? '72px' : '180px',
      width: 'auto'
    });

    $('#adm-global-search').on('keydown', function (e) {
      if (e.keyCode === 13) {
        e.preventDefault();
        var q = $.trim($(this).val());
        if (!q) {
          layer.msg('请输入关键词', { icon: 0 });
          return;
        }
        layer.msg('全局搜索为占位入口，请从左侧菜单进入对应功能页。关键词：' + q, { icon: 0, time: 2200 });
      }
    });

    if ($('body').hasClass('adm-page-chats')) {
      return;
    }

    var $west = $('#layout-west');
    if (!$west.length || $('.adm-collapse-btn').length) {
      return;
    }

    var $btn = $('<button type="button" class="adm-collapse-btn" title="收起/展开侧栏"><i class="layui-icon">&#xe668;</i><span class="adm-collapse-txt">收起菜单</span></button>');
    $west.append($btn);

    $btn.on('click', function () {
      $('body').toggleClass('adm-sidebar-collapsed');
      var c = $('body').hasClass('adm-sidebar-collapsed');
      $btn.find('.adm-collapse-txt').text(c ? '展开菜单' : '收起菜单');
      $('#layout-center').css({ left: c ? '72px' : '180px', width: 'auto' });
    });
  });
})(window.jQuery);
