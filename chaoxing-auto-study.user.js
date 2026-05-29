// ==UserScript==
// @name         超星学习通 自动助手
// @namespace    https://github.com/chaoxing-auto-study
// @version      1.0.0
// @description  自动静音二倍速播放，自动下一节，可配置跳过考试
// @match        https://mooc1.chaoxing.com/mycourse/studentstudy*
// @updateURL    https://raw.githubusercontent.com/用户名/仓库名/main/chaoxing-auto-study.user.js
// @downloadURL  https://raw.githubusercontent.com/用户名/仓库名/main/chaoxing-auto-study.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ==================== 防前台检测 ====================
  (function () {
    var hp = 'hidden'; if ('webkitHidden' in document) hp = 'webkitHidden';
    Object.defineProperty(document, hp, { get: function () { return false; }, configurable: true });
    var vp = 'visibilityState'; if ('webkitVisibilityState' in document) vp = 'webkitVisibilityState';
    Object.defineProperty(document, vp, { get: function () { return 'visible'; }, configurable: true });
    document.addEventListener('visibilitychange', function (e) { e.stopImmediatePropagation(); }, true);
    document.addEventListener('webkitvisibilitychange', function (e) { e.stopImmediatePropagation(); }, true);
    window.addEventListener('blur', function (e) { e.stopImmediatePropagation(); }, true);
    var _ob;
    Object.defineProperty(window, 'onblur', { get: function () { return _ob; }, set: function () { _ob = function () {}; }, configurable: true });
  })();

  function main() {
    // ==================== 状态 ====================
    var S = {
      skipExam: true,
      lastAct: 0,
      cooldown: 6000,
      busy: false,
      timers: [],
    };
    var SK = 'cx_v2';

    function load() {
      try { var s = JSON.parse(localStorage.getItem(SK)); if (s) S.skipExam = s.skipExam !== false; } catch (e) {}
    }
    function save() {
      try { localStorage.setItem(SK, JSON.stringify({ skipExam: S.skipExam })); } catch (e) {}
    }

    // ==================== 日志 ====================
    function log(msg) {
      var el = document.getElementById('cx-log-box');
      if (el) {
        var t = new Date().toLocaleTimeString();
        el.textContent = '[' + t + '] ' + msg + '\n' + el.textContent;
        if (el.textContent.length > 2000) el.textContent = el.textContent.substring(0, 2000);
      }
      console.log('[超星]', msg);
    }

    // ==================== 冷却 ====================
    function canAct(label) {
      var n = Date.now();
      if (S.busy) { log('[忙] ' + label); return false; }
      if (n - S.lastAct < S.cooldown) { log('[冷却] ' + label); return false; }
      S.lastAct = n; S.busy = true; return true;
    }
    function free() { S.busy = false; }

    // ==================== 人机 ====================
    function delay() { return new Promise(function (r) { setTimeout(r, 1000 + Math.random() * 2000); }); }
    function hClick(el, label) {
      if (!el) return Promise.resolve(false);
      return delay().then(function () {
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        return new Promise(function (r) {
          setTimeout(function () {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            el.click(); r(true);
          }, 200 + Math.random() * 300);
        });
      });
    }

    // ==================== iframe 穿透 ====================
    function cardDoc() {
      var mf = document.getElementById('iframe');
      if (!mf) return null;
      try { return mf.contentDocument || mf.contentWindow.document; } catch (e) { return null; }
    }
    function videoDoc() {
      var cd = cardDoc(); if (!cd) return null;
      try { var vf = cd.querySelector('iframe.ans-attach-online'); return vf ? (vf.contentDocument || vf.contentWindow.document) : null; } catch (e) { return null; }
    }

    // ==================== 视频 ====================
    function muteVideo() {
      var vd = videoDoc(); if (!vd) return false;
      var v = vd.querySelector('video'); if (!v) return false;
      v.muted = true; v.volume = 0;
      try { var p = vd.defaultView.videojs && vd.defaultView.videojs('video'); if (p) p.muted(true); } catch (e) {}
      var mb = vd.querySelector('.vjs-mute-control');
      if (mb && !mb.classList.contains('vjs-vol-muted')) { mb.click(); mb.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
      return true;
    }
    function speed2x() {
      var vd = videoDoc(); if (!vd) return false;
      var v = vd.querySelector('video'); if (v) v.playbackRate = 2.0;
      var items = vd.querySelectorAll('.vjs-playback-rate .vjs-menu-item');
      for (var i = 0; i < items.length; i++) { if (items[i].textContent.trim() === '2x') { items[i].click(); break; } }
      return true;
    }
    function playVideo() {
      var vd = videoDoc(); if (!vd) return false;
      var v = vd.querySelector('video'); if (!v) return false;
      if (v.paused && !v.ended) {
        var bb = vd.querySelector('.vjs-big-play-button');
        if (bb && bb.offsetParent) bb.click(); else v.play().catch(function () {});
      }
      return true;
    }
    function execVideo() { muteVideo(); speed2x(); playVideo(); }

    // ==================== 检测 ====================
    function detectType() {
      var cd = cardDoc(); if (!cd) return 'unknown';
      try {
        if (cd.querySelector('iframe.ans-attach-online')) return 'video';
        if (cd.querySelectorAll('.ans-job-icon').length > 0 || cd.querySelector('iframe[jobid*="work-"]')) return 'exam';
      } catch (e) {}
      var ac = document.querySelector('#prev_tab .prev_ul li.active');
      if (ac) {
        var t = (ac.getAttribute('title') || '').trim();
        if (t === '视频') return 'video';
        if (t && (t.indexOf('考试') >= 0 || t.indexOf('测验') >= 0)) return 'exam';
      }
      return 'unknown';
    }

    // ==================== 导航 ====================
    function clickNext() {
      var btn = document.querySelector('#prevNextFocusNext');
      if (btn && btn.offsetParent) return hClick(btn, '下一节');
      var alts = document.querySelectorAll('.prev_next.next.fr');
      for (var i = 0; i < alts.length; i++) {
        if (alts[i].offsetParent && alts[i].textContent.indexOf('下一节') >= 0) return hClick(alts[i], '下一节');
      }
      return Promise.resolve(false);
    }
    function directNext(skipCheck) {
      var cc = document.getElementById('cardcount'), ci = document.getElementById('chapterIdid');
      if (!cc || !ci || typeof PCount === 'undefined') return false;
      var cl = (document.body.innerHTML.match(/stu_clazzId\s*=\s*"(\d+)"/) || [])[1] || '';
      var co = (document.body.innerHTML.match(/stu_CourseId\s*=\s*"(\d+)"/) || [])[1] || '';
      if (!cl || !co) return false;
      if (skipCheck) PCount.next(cc.value, ci.value, co, cl, '');
      else PCount.next(cc.value, ci.value, co, cl, '', true);
      return true;
    }
    function clickPopupNext() {
      var tip = document.querySelector('.jobFinishTip');
      if (!tip || tip.style.display === 'none' || !tip.offsetParent) return Promise.resolve(false);
      var btns = tip.querySelectorAll('.nextChapter');
      for (var i = 0; i < btns.length; i++) { if (btns[i].offsetParent) return hClick(btns[i], '弹窗'); }
      var links = tip.querySelectorAll('a');
      for (var j = 0; j < links.length; j++) { if (links[j].textContent.trim() === '下一节' && links[j].offsetParent) return hClick(links[j], '弹窗'); }
      return Promise.resolve(false);
    }

    function doNext() {
      if (!canAct('下一节')) return;
      clickNext().then(function (ok) {
        if (ok) setTimeout(function () { clickPopupNext().then(free); }, 2000);
        else { var d = directNext(true); setTimeout(function () { clickPopupNext().then(free); }, d ? 2000 : 0); }
      });
    }
    function doSkipExam() {
      if (!canAct('跳过考试')) return;
      if (detectType() !== 'exam') { free(); return; }
      log('→ 跳过考试');
      directNext(true);
      setTimeout(function () { clickPopupNext().then(free); }, 2000);
    }
    function notifyExam() {
      if (detectType() !== 'exam') return;
      log('🔔 检测到考试，请手动作答');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('超星助手', { body: '检测到考试页面，请手动完成作答' });
      }
    }

    // ==================== UI ====================
    function createUI() {
      var panel = document.createElement('div');
      panel.id = 'cx-panel';
      panel.innerHTML =
        '<div id="cx-hdr"><span>超星助手</span><button id="cx-mini">&minus;</button><button id="cx-close">&times;</button></div>' +
        '<div id="cx-body">' +
          '<label id="cx-toggle-row">' +
            '<span class="cx-toggle-label">自动跳过考试</span>' +
            '<span class="cx-toggle"><input type="checkbox" id="cx-t-skip" ' + (S.skipExam ? 'checked' : '') + '><span class="cx-track"><span class="cx-thumb"></span></span></span>' +
          '</label>' +
          '<div id="cx-status">当前: <b id="cx-st-page">-</b> · 开关: <b id="cx-st-skip">' + (S.skipExam ? '跳过' : '通知') + '</b></div>' +
          '<div id="cx-log-wrap">' +
            '<div id="cx-log-hdr">日志 ▾</div>' +
            '<pre id="cx-log-box"></pre>' +
          '</div>' +
        '</div>';

      var css = document.createElement('style');
      css.textContent =
        '#cx-panel{position:fixed;top:80px;right:16px;z-index:99999;width:260px;background:linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,245,255,0.96));backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:14px;box-shadow:0 4px 32px rgba(102,51,204,0.12),0 1px 4px rgba(0,0,0,0.06);font:13px/1.5 "Microsoft YaHei","PingFang SC",sans-serif;color:#2d2048;user-select:none;border:1px solid rgba(139,92,246,0.12)}' +
        '#cx-hdr{display:flex;align-items:center;padding:10px 14px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border-radius:13px 13px 0 0;cursor:move;font-weight:700;font-size:13px;letter-spacing:0.3px}' +
        '#cx-hdr span{flex:1}#cx-hdr button{background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:16px;cursor:pointer;margin-left:6px;width:24px;height:24px;line-height:22px;text-align:center;border-radius:8px;padding:0;transition:background 0.15s}#cx-hdr button:hover{background:rgba(255,255,255,0.28)}' +
        '#cx-body{padding:10px 14px 12px}' +
        '#cx-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(139,92,246,0.04));border-radius:10px;cursor:pointer;margin-bottom:8px;border:1px solid rgba(124,58,237,0.08)}' +
        '.cx-toggle-label{font-weight:600;font-size:13px;color:#4c1d95}' +
        '.cx-toggle{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0}.cx-toggle input{opacity:0;width:0;height:0}' +
        '.cx-track{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#d4c5f0;border-radius:24px;transition:0.25s}' +
        '.cx-thumb{position:absolute;height:20px;width:20px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:0.25s;box-shadow:0 1px 4px rgba(0,0,0,0.15)}' +
        '.cx-toggle input:checked+.cx-track{background:linear-gradient(135deg,#7c3aed,#a855f7)}' +
        '.cx-toggle input:checked+.cx-track .cx-thumb{transform:translateX(20px)}' +
        '#cx-status{font-size:11px;color:#8b7ba8;margin-bottom:8px;padding:0 4px}#cx-status b{color:#5b21b6}' +
        '#cx-log-wrap{border-top:1px solid rgba(139,92,246,0.1);padding-top:6px}' +
        '#cx-log-hdr{font-size:11px;font-weight:600;color:#a091c4;cursor:pointer;padding:2px 4px;border-radius:4px;user-select:none}' +
        '#cx-log-hdr:hover{color:#7c3aed}' +
        '#cx-log-box{font-size:10px;color:#8b7ba8;background:rgba(124,58,237,0.03);border-radius:6px;padding:6px 8px;max-height:120px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;margin:4px 0 0;font-family:monospace;line-height:1.5}' +
        '#cx-log-box.cx-collapsed{display:none}' +
        '#cx-mini-float{position:fixed;top:80px;right:16px;z-index:99998;width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border:none;font-size:14px;cursor:pointer;box-shadow:0 2px 12px rgba(124,58,237,0.3);display:none;text-align:center;line-height:32px;padding:0}';

      document.head.appendChild(css);
      document.body.appendChild(panel);

      // 拖拽
      (function () {
        var ox = 0, oy = 0;
        document.getElementById('cx-hdr').onmousedown = function (e) {
          e.preventDefault(); var r = panel.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
          document.onmousemove = function (ev) { ev.preventDefault(); panel.style.top = (ev.clientY - oy) + 'px'; panel.style.left = (ev.clientX - ox) + 'px'; panel.style.right = 'auto'; };
          document.onmouseup = function () { document.onmousemove = null; document.onmouseup = null; };
        };
      })();

      // 最小化
      var mini = document.createElement('button');
      mini.id = 'cx-mini-float'; mini.textContent = '+';
      mini.onclick = function () { panel.style.display = 'block'; mini.style.display = 'none'; };
      document.body.appendChild(mini);
      document.getElementById('cx-mini').onclick = function () { panel.style.display = 'none'; mini.style.display = 'block'; };
      document.getElementById('cx-close').onclick = function () { panel.style.display = 'none'; mini.style.display = 'none'; };

      // 日志折叠
      document.getElementById('cx-log-hdr').onclick = function () {
        document.getElementById('cx-log-box').classList.toggle('cx-collapsed');
        this.textContent = document.getElementById('cx-log-box').classList.contains('cx-collapsed') ? '日志 ▸' : '日志 ▾';
      };

      // 开关
      document.getElementById('cx-t-skip').onchange = function () {
        S.skipExam = this.checked; save();
        document.getElementById('cx-st-skip').textContent = this.checked ? '跳过' : '通知';
        log('考试策略: ' + (this.checked ? '自动跳过' : '通知提醒'));
        if (this.checked && detectType() === 'exam') setTimeout(function () { doSkipExam(); }, 1000);
      };

      // 状态刷新
      setInterval(function () {
        var m = { video: '视频页', exam: '考试页', unknown: '-' };
        document.getElementById('cx-st-page').textContent = m[detectType()] || '?';
      }, 2000);
    }

    // ==================== 主循环 ====================
    function startLoop() {
      var lastType = detectType();
      S.timers.push(setInterval(function () {
        var t = detectType();

        // 始终执行视频设置
        var vd = videoDoc();
        if (vd) {
          var v = vd.querySelector('video');
          if (v) {
            if (!v.muted) { v.muted = true; v.volume = 0; }
            if (v.playbackRate !== 2.0) v.playbackRate = 2.0;
            if (v.paused && !v.ended) {
              var bb = vd.querySelector('.vjs-big-play-button');
              if (bb && bb.offsetParent) bb.click(); else v.play().catch(function () {});
            }
            if (!v.__cx_end) {
              v.__cx_end = true;
              v.addEventListener('ended', function () { log('视频结束'); setTimeout(doNext, 800); });
            }
          }
        }

        if (t !== lastType) {
          lastType = t;
          log('页面: ' + ({ video: '视频', exam: '考试', unknown: '未知' })[t]);
          if (t === 'exam') {
            if (S.skipExam) setTimeout(function () { doSkipExam(); }, 1500);
            else setTimeout(notifyExam, 1500);
          }
        }
      }, 3000));

      // 弹窗检测
      S.timers.push(setInterval(function () {
        var tip = document.querySelector('.jobFinishTip');
        if (tip && tip.style.display !== 'none' && tip.offsetParent) {
          if (!canAct('弹窗')) return;
          log('检测到弹窗');
          clickPopupNext().then(free);
        }
      }, 2000));
    }

    // ==================== 初始化 ====================
    function init() {
      load();
      createUI();

      if (typeof videoAutoPlay !== 'undefined') window.videoAutoPlay = '1';

      // 请求通知权限
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // 章节切换监听
      var md = document.getElementById('mainid');
      if (md) {
        new MutationObserver(function () {
          setTimeout(function () {
            execVideo();
            setTimeout(function () {
              if (detectType() === 'exam') {
                if (S.skipExam) doSkipExam();
                else notifyExam();
              }
            }, 3000);
          }, 2000);
        }).observe(md, { childList: true });
      }

      log('已启动 · 考试' + (S.skipExam ? '跳过' : '通知'));
      setTimeout(execVideo, 2000);

      // 初始检测
      setTimeout(function () {
        if (detectType() === 'exam') {
          if (S.skipExam) doSkipExam();
          else notifyExam();
        }
      }, 3000);

      startLoop();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();
