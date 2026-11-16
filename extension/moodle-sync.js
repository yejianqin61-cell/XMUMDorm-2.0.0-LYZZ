/**
 * 在 Moodle 页面里运行（同源）：读当前登录用户的课程和截止事件，算出 DDL，存到本机 chrome.storage.local。
 * - 只发往 https://l.xmu.edu.my 的官方 AJAX；不读 cookie，不碰密码；sesskey 只在本次调用里用
 * - 一次同步最多 3 个请求批次；10 分钟内不重复自动同步（弹窗「立即同步」不受限）
 * 依赖 lib/moodle-core.js（manifest 里先加载）。
 */
/* global chrome, DormMoodle */
(function () {
  'use strict';
  var core = DormMoodle;
  var AUTO_INTERVAL_MS = 10 * 60 * 1000;
  var MAX_BATCHES = 3;
  var running = false;

  function storageGet(keys) {
    return new Promise(function (resolve) { chrome.storage.local.get(keys, resolve); });
  }
  function storageSet(values) {
    return new Promise(function (resolve) { chrome.storage.local.set(values, resolve); });
  }

  async function ajax(sesskey, calls) {
    var info = calls.map(function (c) { return c.methodname; }).join(',');
    var body = calls.map(function (c, index) { return { index: index, methodname: c.methodname, args: c.args }; });
    var res = await fetch(core.ORIGIN + '/lib/ajax/service.php?sesskey=' + encodeURIComponent(sesskey) + '&info=' + encodeURIComponent(info), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw Object.assign(new Error('http ' + res.status), { status: 'unavailable' });
    var data = await res.json();
    if (!Array.isArray(data)) {
      // 会话过期时 Moodle 会返回单个错误对象
      throw Object.assign(new Error('bad ajax reply'), { status: core.classifyAjaxError(data) });
    }
    return data.map(function (item) {
      if (!item || item.error) throw Object.assign(new Error('ajax error'), { status: core.classifyAjaxError(item) });
      return item.data;
    });
  }

  async function writeStatus(userId, patch) {
    var key = 'moodle:user:' + userId;
    var current = (await storageGet([key]))[key] || {};
    var next = Object.assign({}, current, patch);
    var values = { 'moodle:active': userId };
    values[key] = next;
    await storageSet(values);
    return next;
  }

  async function sync(force) {
    if (running) return { status: 'busy' };
    var identity = core.inspectIdentity(document);
    if (identity.status !== 'confirmed') {
      if (identity.status === 'logged-out') {
        var active = (await storageGet(['moodle:active']))['moodle:active'];
        if (active) await writeStatus(active, { status: 'expired', checkedAt: Date.now() });
      }
      return { status: identity.status };
    }
    var userId = identity.userId;
    var key = 'moodle:user:' + userId;
    var previous = (await storageGet([key]))[key];
    if (!force && previous && previous.status === 'ok' && Date.now() - (previous.syncedAt || 0) < AUTO_INTERVAL_MS) {
      await storageSet({ 'moodle:active': userId });
      return { status: 'fresh' };
    }
    var sesskey = core.readSesskey(document.documentElement ? document.documentElement.innerHTML : '');
    if (!sesskey) return { status: 'unknown' };

    running = true;
    try {
      var now = Date.now();
      var from = Math.floor(now / 1000) - 30 * 86400;
      var batches = 1;
      var first = await ajax(sesskey, [core.coursesCall(), core.eventsCall(from, 0)]);
      var courses = core.parseCourses(first[0]);
      var page = core.parseEvents(first[1]);
      if (!courses || !page) throw Object.assign(new Error('invalid data'), { status: 'invalid-data' });
      var events = page.events.slice();
      var lastId = page.lastId;
      var fetchedPages = page.events.length === 50 ? 1 : 0;

      var states = [];
      var loadedCourses = {};
      while (batches < MAX_BATCHES) {
        var neededCourses = [];
        events.forEach(function (ev) {
          if (!loadedCourses[ev.courseId] && neededCourses.indexOf(ev.courseId) < 0) neededCourses.push(ev.courseId);
        });
        var morePages = fetchedPages > 0 && lastId !== null;
        if (!neededCourses.length && !morePages) break;
        var calls = neededCourses.map(core.stateCall);
        if (morePages) calls.push(core.eventsCall(from, lastId));
        var replies = await ajax(sesskey, calls);
        batches += 1;
        neededCourses.forEach(function (courseId, index) {
          loadedCourses[courseId] = true;
          var state = core.parseState(replies[index]);
          if (state && state.courseId === courseId) states.push(state);
        });
        fetchedPages = 0;
        if (morePages) {
          var next = core.parseEvents(replies[replies.length - 1]);
          if (!next) throw Object.assign(new Error('invalid data'), { status: 'invalid-data' });
          events = events.concat(next.events);
          lastId = next.lastId;
          fetchedPages = next.events.length === 50 ? 1 : 0;
        }
      }
      var buckets = core.partitionDeadlines(states, events, now);
      var items = core.projectDeadlines(buckets, courses.courses, now);
      await writeStatus(userId, { status: 'ok', syncedAt: now, checkedAt: now, items: items, truncated: fetchedPages > 0 });
      return { status: 'ok', count: items.length };
    } catch (error) {
      var status = (error && error.status) || 'unavailable';
      await writeStatus(userId, { status: status, checkedAt: Date.now() });
      return { status: status };
    } finally {
      running = false;
    }
  }

  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    if (message && message.type === 'dorm-moodle:sync-now') {
      sync(true).then(sendResponse);
      return true;
    }
    return false;
  });

  sync(false);
})();
