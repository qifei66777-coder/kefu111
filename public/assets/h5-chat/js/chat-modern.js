/**
 * H5 聊天页现代 UI 适配：不改变业务 JS 变量与接口，仅 UI 交互与安全区。
 */
(function () {
  function scrollChatToBottom(delay) {
    setTimeout(function () {
      var wrap = document.getElementById('wrap');
      if (wrap) {
        wrap.scrollTop = wrap.scrollHeight;
      }
    }, delay || 0);
  }

  function syncLayoutVars() {
    var foot = document.getElementById('h5_foot_all');
    var panel = document.getElementById('h5_tools_panel');
    var root = document.body;
    if (!root) return;

    var footHeight = foot ? foot.offsetHeight : 64;
    var panelHeight = panel && panel.classList.contains('is-open') ? panel.offsetHeight : 0;
    root.style.setProperty('--h5-foot-real-h', footHeight + 'px');
    root.style.setProperty('--h5-tools-panel-h', panelHeight + 'px');
  }

  function syncHeaderStatus() {
    var legacy = document.getElementById('status');
    var line = document.getElementById('h5_status_line');
    var header = document.querySelector('.h5-chat-header');
    if (!legacy || !line) return;
    var raw = (legacy.textContent || '').trim();
    if (raw.indexOf('离线') >= 0 || raw === '[离线]') {
      line.textContent = '离线';
      if (header) header.classList.add('is-offline');
    } else {
      line.textContent = '在线 · 正在为您服务';
      if (header) header.classList.remove('is-offline');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncHeaderStatus();
    syncLayoutVars();
    var legacy = document.getElementById('status');
    if (legacy && typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(syncHeaderStatus);
      mo.observe(legacy, { subtree: true, characterData: true, childList: true });
    }

    var plus = document.getElementById('h5_btn_plus');
    var panel = document.getElementById('h5_tools_panel');
    if (plus && panel) {
      plus.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = panel.classList.toggle('is-open');
        plus.classList.toggle('is-open', open);
        document.body.classList.toggle('h5-tools-open', open);
        syncLayoutVars();
        scrollChatToBottom(90);
      });
    }

    var more = document.getElementById('h5_btn_more');
    if (more) {
      more.addEventListener('click', function () {
        if (typeof window.h5ChatMoreHandler === 'function') {
          window.h5ChatMoreHandler();
          return;
        }
        if (typeof layer !== 'undefined') {
          layer.msg('更多功能请使用网页菜单');
        }
      });
    }

    var ti = document.getElementById('text_in');
    if (ti && window.visualViewport) {
      var scrollInput = function () {
        syncLayoutVars();
        setTimeout(function () {
          ti.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          scrollChatToBottom(40);
        }, 280);
      };
      ti.addEventListener('focus', scrollInput);
      window.visualViewport.addEventListener('resize', function () {
        if (document.activeElement === ti) scrollInput();
      });
    }

    document.addEventListener('click', function (e) {
      if (!panel || !plus || !panel.classList.contains('is-open')) return;
      var t = e.target;
      if (panel.contains(t) || plus.contains(t)) return;
      panel.classList.remove('is-open');
      plus.classList.remove('is-open');
      document.body.classList.remove('h5-tools-open');
      syncLayoutVars();
    });

    window.addEventListener('resize', syncLayoutVars);
    window.addEventListener('orientationchange', function () {
      syncLayoutVars();
      scrollChatToBottom(120);
    });

    if (typeof MutationObserver !== 'undefined') {
      var log = document.getElementById('log');
      if (log) {
        var logObserver = new MutationObserver(function () {
          syncLayoutVars();
        });
        logObserver.observe(log, { childList: true, subtree: true });
      }
    }
  });
})();
