/**
 * 在厦马小筑 Web 页面里运行：页面发来请求时，把本机存的 Moodle 截止投影交给页面。
 * - 只回应本窗口自己发的、命名空间和版本都对的请求；回复只发给本页面的 origin
 * - 只交出投影（标题、课程名、截止时间、链接、是否完成），不含任何 Moodle 会话信息
 * 不依赖 moodle-core.js，常量与它保持一致（测试会核对）。
 */
/* global chrome */
(function () {
  'use strict';
  var NS = 'xmum-dorm-moodle';
  var VERSION = 1;

  window.addEventListener('message', function (event) {
    if (event.source !== window || event.origin !== window.location.origin) return;
    var data = event.data;
    if (!data || data.ns !== NS || data.v !== VERSION || data.type !== 'request') return;
    if (typeof data.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(data.id)) return;
    chrome.storage.local.get(null, function (all) {
      var active = all['moodle:active'];
      var entry = active ? all['moodle:user:' + active] : null;
      var reply = { ns: NS, v: VERSION, type: 'reply', id: data.id, installed: true };
      if (!entry) {
        reply.status = 'empty';
        reply.items = [];
      } else {
        reply.status = entry.status || 'unknown';
        reply.syncedAt = entry.syncedAt || null;
        reply.items = Array.isArray(entry.items) ? entry.items : [];
      }
      window.postMessage(reply, window.location.origin);
    });
  });
})();
