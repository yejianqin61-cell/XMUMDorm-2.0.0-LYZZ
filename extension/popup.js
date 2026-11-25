/* global chrome */
(function () {
  'use strict';
  var MOODLE = 'https://l.xmu.edu.my/';
  var statusEl = document.getElementById('status');
  var detailEl = document.getElementById('detail');
  var syncBtn = document.getElementById('sync');
  var clearBtn = document.getElementById('clear');

  var LABELS = {
    ok: '已同步',
    expired: 'Moodle 登录已过期，请重新登录 Moodle',
    denied: 'Moodle 拒绝了读取请求',
    unavailable: '同步失败：Moodle 暂时连不上',
    'invalid-data': '同步失败：Moodle 返回的数据看不懂（可能学校升级了 Moodle）',
    unknown: '还没同步过',
  };

  function fmt(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function render() {
    chrome.storage.local.get(null, function (all) {
      var active = all['moodle:active'];
      var entry = active ? all['moodle:user:' + active] : null;
      if (!entry) {
        statusEl.textContent = '还没同步过';
        statusEl.className = 'status';
        detailEl.textContent = '在这个浏览器里登录并打开任意 Moodle 页面，会自动同步。';
        return;
      }
      var status = entry.status || 'unknown';
      statusEl.textContent = LABELS[status] || LABELS.unknown;
      statusEl.className = 'status ' + (status === 'ok' ? 'ok' : 'warn');
      var items = Array.isArray(entry.items) ? entry.items : [];
      var open = items.filter(function (it) { return !it.done && it.dueAt > Date.now(); }).length;
      var parts = [];
      if (entry.syncedAt) parts.push('上次成功同步：' + fmt(entry.syncedAt));
      parts.push('未完成的截止：' + open + ' 项');
      if (entry.truncated) parts.push('截止事件太多，只同步了前 100 条');
      detailEl.textContent = parts.join(' · ');
    });
  }

  syncBtn.addEventListener('click', function () {
    syncBtn.disabled = true;
    statusEl.textContent = '同步中…';
    chrome.tabs.query({ url: MOODLE + '*' }, function (tabs) {
      if (!tabs || !tabs.length) {
        // 没有打开的 Moodle 页面：开一个，内容脚本会自动同步
        chrome.tabs.create({ url: MOODLE + 'my/' });
        statusEl.textContent = '已打开 Moodle，登录后会自动同步';
        syncBtn.disabled = false;
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: 'dorm-moodle:sync-now' }, function () {
        void chrome.runtime.lastError;
        syncBtn.disabled = false;
        render();
      });
    });
  });

  clearBtn.addEventListener('click', function () {
    chrome.storage.local.clear(function () {
      statusEl.textContent = '已清除。学习日历不会再显示 Moodle 截止时间。';
      statusEl.className = 'status';
      detailEl.textContent = '';
    });
  });

  render();
})();
