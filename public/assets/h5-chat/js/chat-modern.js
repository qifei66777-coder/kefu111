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
        var logObserver = new MutationObserver(function (mutations) {
          syncLayoutVars();
          var hasAppend = false;
          for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            if (m.type !== 'childList' || !m.addedNodes || m.addedNodes.length === 0) continue;
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (!node || node.nodeType !== 1 || !node.parentNode) continue;
              if (node === node.parentNode.lastElementChild) {
                hasAppend = true;
                break;
              }
            }
            if (hasAppend) break;
          }
          if (hasAppend) {
            scrollChatToBottom(0);
            scrollChatToBottom(60);
            scrollChatToBottom(200);
            scrollChatToBottom(500);
          }
        });
        logObserver.observe(log, { childList: true, subtree: false });
      }
    }

    // ========== 发送消息后强制滚动到底（多重兜底） ==========
    // 老 mochat.js 内部也有 scrollTop 但因 fixed foot 高度变化常常被压住
    function forceScrollAfterSend() {
      [0, 60, 160, 320, 600, 1000].forEach(function (d) { scrollChatToBottom(d); });
    }
    var sendBtn = document.querySelector('.send-btn, .h5-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', forceScrollAfterSend);
    }
    var textIn = document.getElementById('text_in');
    if (textIn) {
      textIn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
          forceScrollAfterSend();
        }
      });
    }

    // ========== Emoji 表情面板（Unicode 替代缺失 GIF） ==========
    var H5_EMOJIS = [
      '\uD83D\uDE00', '\uD83D\uDE0A', '\uD83D\uDE02', '\uD83E\uDD23',
      '\uD83E\uDD70', '\uD83D\uDE0E', '\uD83E\uDD14', '\uD83D\uDE09',
      '\uD83D\uDE18', '\uD83D\uDE0D', '\uD83E\uDD29', '\uD83D\uDE0B',
      '\uD83D\uDE1C', '\uD83E\uDD13', '\uD83D\uDE34', '\uD83D\uDE2D',
      '\uD83D\uDE31', '\uD83D\uDE21', '\uD83D\uDE2C', '\uD83D\uDE44',
      '\uD83D\uDE33', '\uD83E\uDD7A', '\uD83D\uDE08', '\uD83E\uDD2F',
      '\uD83D\uDC4D', '\uD83D\uDC4E', '\uD83D\uDC4F', '\uD83D\uDE4F',
      '\uD83D\uDCAA', '\u2764\uFE0F', '\uD83D\uDD25', '\uD83D\uDCAF'
    ];

    function renderH5EmojiPanel() {
      var main = document.querySelector('.wl_faces_main');
      if (!main) return;
      // 已经渲染过 unicode 版就不重复
      if (main.getAttribute('data-emoji-mode') === 'unicode') return;
      var html = '<ul class="h5-emoji-grid">';
      for (var i = 0; i < H5_EMOJIS.length; i++) {
        html += '<li><span class="h5-emoji-btn" data-emoji="' + H5_EMOJIS[i] + '">' + H5_EMOJIS[i] + '</span></li>';
      }
      html += '</ul>';
      main.innerHTML = html;
      main.setAttribute('data-emoji-mode', 'unicode');
    }

    // 覆盖老 mochat.js 的 faceon —— 这里在 DOMContentLoaded 内执行，
    // 此时 mochat.js 的 var faceon 已挂在 window 上，可被覆盖
    window.faceon = function (ev) {
      var panel = document.getElementById('h5_tools_panel');
      var plus = document.getElementById('h5_btn_plus');
      if (panel && !panel.classList.contains('is-open')) {
        panel.classList.add('is-open');
        if (plus) plus.classList.add('is-open');
        document.body.classList.add('h5-tools-open');
      }
      renderH5EmojiPanel();
      var box = document.querySelector('.tool_box');
      if (box) box.style.display = 'block';
      syncLayoutVars();
      scrollChatToBottom(80);
      var e = ev || window.event;
      if (e && e.stopPropagation) e.stopPropagation();
      return false;
    };

    // emoji 点击 → 直接把 unicode 字符插入 #text_in
    // 绑在 .wl_faces_main 上，确保事件先于 body 的 tool_box.hide() 命中
    if (window.jQuery) {
      window.jQuery(document).on('click', '.wl_faces_main .h5-emoji-btn', function (e) {
        e.stopPropagation();
        e.preventDefault();
        var ch = this.getAttribute('data-emoji') || this.textContent;
        var ti = document.getElementById('text_in');
        if (!ti || !ch) return;
        var start = ti.selectionStart;
        var end = ti.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number') {
          ti.value = ti.value.substring(0, start) + ch + ti.value.substring(end);
          ti.selectionStart = ti.selectionEnd = start + ch.length;
        } else {
          ti.value = (ti.value || '') + ch;
        }
        try { ti.focus(); } catch (err) {}
      });
    }
  });
})();
