/**
 * Moodle 读取核心（任务管理表 #6「web:moodle接入」，需求见 docs/01-Requirement/Moodle浏览器扩展/）
 *
 * 浏览器扩展（extension/）和测试共用这一份。扩展里是普通脚本（MV3 静态内容脚本不能用 ES module），
 * 所以写成 UMD：浏览器里挂到 globalThis.DormMoodle，Node 里 module.exports。
 * ⚠️ 改这里之后执行 `npm run extension:sync-core`，把副本拷到 extension/lib/；测试会检查两份一致。
 *
 * 口径与 App（app/src/features/tools/moodle/contract.ts、deadlines.ts）保持一致：
 *   - 只认 https://l.xmu.edu.my，URL 只保留白名单参数
 *   - DDL 判定：expectcompletionon；assign 的 due；quiz 的 close；必须对上课程 + 活动链接
 *   - 只读，不碰 cookie、不读密码；sesskey 只用于同源调用 Moodle 官方 AJAX，不保存、不外传
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DormMoodle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ORIGIN = 'https://l.xmu.edu.my';
  /** Web 页面 ↔ 扩展的 postMessage 协议 */
  var BRIDGE_NS = 'xmum-dorm-moodle';
  var BRIDGE_VERSION = 1;
  var MAX_FUTURE_DAYS = 366;
  var KEEP_PAST_DAYS = 30;

  function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
  }
  function integer(value, minimum) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum ? value : null;
  }
  /** 校方 core_courseformat_get_state 把 id 写成十进制字符串 */
  function looseInteger(value, minimum) {
    if (typeof value === 'number') return Number.isSafeInteger(value) && value >= minimum ? value : null;
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      var parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
    }
    return null;
  }
  function text(value) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  }
  function enabled(value) {
    return value === true || value === 1;
  }

  /** Moodle 链接白名单：同源、无账号、只留数字型 id 类参数、去掉 hash */
  function safeUrl(value) {
    if (typeof value !== 'string' || value.trim() === '' || value.length > 2048) return null;
    try {
      var url = new URL(value, ORIGIN + '/');
      if (url.origin !== ORIGIN || url.username !== '' || url.password !== '') return null;
      var pairs = url.search.slice(1).split('&');
      var safe = [];
      for (var i = 0; i < pairs.length; i += 1) {
        var pair = pairs[i].split('=');
        var key = decodeURIComponent(pair[0] || '').toLowerCase();
        var allowed = key === 'id' || key === 'courseid' || key === 'cmid' || key === 'section' || key === 'sectionid';
        if (allowed && pair.length === 2 && /^\d+$/.test(pair[1])) safe.push(key + '=' + pair[1]);
      }
      url.search = safe.length === 0 ? '' : '?' + safe.join('&');
      url.hash = '';
      return url.href;
    } catch (e) {
      return null;
    }
  }

  /** 活动链接只认 /mod/<type>/view.php?id=N（和 App 的 safeMoodleReadUrl 非文件分支一致的子集） */
  function safeModuleUrl(value) {
    var url = safeUrl(value);
    if (!url) return null;
    var parsed = new URL(url);
    if (!/^\/mod\/[a-z][a-z0-9_]*\/view\.php$/.test(parsed.pathname)) return null;
    return /^[1-9]\d*$/.test(parsed.searchParams.get('id') || '') && parsed.search === '?id=' + parsed.searchParams.get('id') ? url : null;
  }

  function parseCourses(raw) {
    var r = record(raw);
    if (!r || !Array.isArray(r.courses)) return null;
    var courses = [];
    for (var i = 0; i < r.courses.length; i += 1) {
      var item = record(r.courses[i]);
      if (!item || !enabled(item.visible)) continue;
      var id = integer(item.id, 1);
      var name = text(item.fullnamedisplay) || text(item.fullname);
      if (id === null || name === null) continue;
      courses.push({ id: id, name: name, shortName: text(item.shortname) });
    }
    return { courses: courses, nextOffset: integer(r.nextoffset, 0) };
  }

  function parseState(raw) {
    var decoded = raw;
    if (typeof decoded === 'string') {
      try { decoded = JSON.parse(decoded); } catch (e) { return null; }
    }
    var r = record(decoded);
    var course = r && record(r.course);
    var courseId = course ? looseInteger(course.id, 1) : null;
    if (courseId === null || !Array.isArray(r.cm)) return null;
    var modules = [];
    var seen = {};
    for (var i = 0; i < r.cm.length; i += 1) {
      var item = record(r.cm[i]);
      if (!item || !enabled(item.visible)) continue;
      var id = looseInteger(item.id, 1);
      var type = text(item.module);
      var name = text(item.name);
      if (id === null || type === null || name === null || !/^[a-z][a-z0-9_]*$/.test(type) || seen[id]) continue;
      var userVisible = enabled(item.uservisible);
      var completionState = looseInteger(item.completionstate, 0);
      modules.push({
        id: id, type: type, name: name,
        url: userVisible ? safeUrl(item.url) : null,
        visible: true, userVisible: userVisible,
        completion: completionState === null ? null : { state: completionState, complete: item.isoverallcomplete === true },
      });
      seen[id] = true;
    }
    return { courseId: courseId, modules: modules };
  }

  function parseEvents(raw) {
    var r = record(raw);
    if (!r || !Array.isArray(r.events)) return null;
    var events = [];
    var seen = {};
    for (var i = 0; i < r.events.length; i += 1) {
      var item = record(r.events[i]);
      if (!item || (item.visible !== undefined && !enabled(item.visible))) continue;
      var course = record(item.course);
      var courseId = course ? integer(course.id, 1) : null;
      var id = integer(item.id, 1);
      var name = text(item.name);
      var time = integer(item.timesort, 0);
      if (id === null || courseId === null || name === null || time === null || seen[id]) continue;
      var action = record(item.action);
      var eventType = typeof item.eventtype === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(item.eventtype) ? item.eventtype : null;
      events.push({
        id: id, courseId: courseId, name: name, time: time, eventType: eventType,
        url: safeUrl(item.url) || safeUrl(action ? action.url : null),
        actionable: action && typeof action.actionable === 'boolean' ? action.actionable : null,
      });
      seen[id] = true;
    }
    var last = r.lastid === undefined || r.lastid === null ? null : integer(r.lastid, 1);
    return { events: events, lastId: last };
  }

  function isDeadlineEvent(module, event) {
    return event.eventType === 'expectcompletionon'
      || (module.type === 'assign' && event.eventType === 'due')
      || (module.type === 'quiz' && event.eventType === 'close');
  }

  /** 把课程状态 + 截止事件配成 DDL：必须课程相同、活动链接完全一致，绝不按标题猜 */
  function partitionDeadlines(states, events, now) {
    var result = { valid: [], past: [], futureAnomalies: [] };
    if (!Number.isFinite(now)) return result;
    var maximum = now + MAX_FUTURE_DAYS * 86400000;
    for (var s = 0; s < states.length; s += 1) {
      var state = states[s];
      for (var m = 0; m < state.modules.length; m += 1) {
        var module = state.modules[m];
        if (!module.visible || !module.userVisible) continue;
        var url = safeModuleUrl(module.url);
        if (!url) continue;
        for (var e = 0; e < events.length; e += 1) {
          var event = events[e];
          if (event.courseId !== state.courseId || event.url !== url || !isDeadlineEvent(module, event)) continue;
          if (!Number.isSafeInteger(event.time) || event.time <= 0) continue;
          var dueAt = event.time * 1000;
          var deadline = { courseId: state.courseId, module: module, event: event, dueAt: dueAt };
          if (dueAt <= now) result.past.push(deadline);
          else if (dueAt > maximum) result.futureAnomalies.push(deadline);
          else result.valid.push(deadline);
        }
      }
    }
    var byDue = function (a, b) { return a.dueAt - b.dueAt; };
    result.valid.sort(byDue); result.past.sort(byDue); result.futureAnomalies.sort(byDue);
    return result;
  }

  /**
   * 课程在日历上的显示名。校方课程的 shortname 是老师随手填的（"EEE211*_2"、"EMath"、"EEE2032609Lian"），
   * 全名里几乎都有课程代码（"(2026-09)-DATA STRUCTURES(EEE211)"、"EEE 202 Engineers and Society …"），
   * 所以优先从全名里取「3 个大写字母 + 3 位数字」，取不到再用全名截断。（2026-11-16 用真实账号核对过）
   */
  function courseLabel(course) {
    var sources = [course.name, course.shortName];
    for (var i = 0; i < sources.length; i += 1) {
      var match = typeof sources[i] === 'string' ? /\b([A-Z]{3})\s?(\d{3})\b/.exec(sources[i]) : null;
      if (match) return match[1] + match[2];
    }
    var name = course.name || course.shortName || '';
    return name.length > 40 ? name.slice(0, 39) + '…' : name;
  }

  /** 交给 Web 的投影：只有标题、课程名、截止时间、链接、是否已完成 */
  function projectDeadlines(buckets, courses, now) {
    var names = {};
    for (var i = 0; i < courses.length; i += 1) names[courses[i].id] = courseLabel(courses[i]);
    var oldest = now - KEEP_PAST_DAYS * 86400000;
    var rows = buckets.past.filter(function (d) { return d.dueAt >= oldest; }).concat(buckets.valid);
    return rows.map(function (d) {
      var done = d.event.actionable === false || (d.module.completion !== null && d.module.completion.complete === true);
      return {
        id: 'moodle:' + d.courseId + ':' + d.event.id,
        title: d.module.name.slice(0, 200),
        courseName: (names[d.courseId] || '').slice(0, 120),
        dueAt: d.dueAt,
        url: safeModuleUrl(d.module.url),
        done: done,
      };
    });
  }

  /** 页面登录态 + 用户 id（选择器与 App identity.ts 相同，来自校方实站） */
  function inspectIdentity(doc) {
    if (!doc || typeof doc.querySelector !== 'function') return { status: 'unknown' };
    if (doc.querySelector('input[type=password]') || doc.querySelector('.usermenu .login')) return { status: 'logged-out' };
    var menu = doc.querySelector('#user-menu-toggle') || doc.querySelector('.usermenu-container');
    if (!menu) return { status: 'unknown' };
    var declared = doc.querySelector('#usernavigation [data-userid]') || doc.querySelector('nav.navbar [data-userid]')
      || doc.querySelector('.usermenu-container [data-userid]');
    var raw = declared ? String(declared.getAttribute('data-userid') || '').trim() : '';
    if (!/^[1-9]\d*$/.test(raw)) return { status: 'unknown' };
    return { status: 'confirmed', userId: Number(raw) };
  }

  /** 从页面内联的 M.cfg 里读 sesskey（内容脚本拿不到页面的 window.M） */
  function readSesskey(html) {
    if (typeof html !== 'string') return null;
    var match = /"sesskey"\s*:\s*"([A-Za-z0-9]{6,32})"/.exec(html);
    return match ? match[1] : null;
  }

  /** Moodle AJAX 的错误码 → 我们的状态 */
  function classifyAjaxError(item) {
    var exception = record(item && item.exception) || {};
    var code = exception.errorcode;
    if (code === 'servicerequireslogin' || code === 'invalidsesskey' || code === 'requireloginerror') return 'expired';
    if (code === 'nopermissions' || code === 'accessdenied') return 'denied';
    return 'unavailable';
  }

  function coursesCall() {
    return { methodname: 'core_course_get_enrolled_courses_by_timeline_classification',
      args: { classification: 'inprogress', limit: 0, offset: 0, sort: 'fullname' } };
  }
  function eventsCall(timesortFrom, afterEventId) {
    // Moodle 4.5 只有在下界非零时才认 aftereventid；同一次同步每页用同一个下界
    return { methodname: 'core_calendar_get_action_events_by_timesort',
      args: { timesortfrom: timesortFrom, aftereventid: afterEventId || 0, limitnum: 50 } };
  }
  function stateCall(courseId) {
    return { methodname: 'core_courseformat_get_state', args: { courseid: courseId } };
  }

  /** Web 侧收到的列表要再洗一遍（消息来自页面环境，不可信） */
  function sanitizeProjection(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length && out.length < 500; i += 1) {
      var item = record(list[i]);
      if (!item || typeof item.id !== 'string' || !/^moodle:\d+:\d+$/.test(item.id)) continue;
      var title = text(item.title);
      if (!title || !Number.isSafeInteger(item.dueAt) || item.dueAt <= 0) continue;
      out.push({
        id: item.id,
        title: title.slice(0, 200),
        courseName: typeof item.courseName === 'string' ? item.courseName.slice(0, 120) : '',
        dueAt: item.dueAt,
        url: safeModuleUrl(item.url),
        done: item.done === true,
      });
    }
    return out;
  }

  return {
    ORIGIN: ORIGIN,
    BRIDGE_NS: BRIDGE_NS,
    BRIDGE_VERSION: BRIDGE_VERSION,
    safeUrl: safeUrl,
    safeModuleUrl: safeModuleUrl,
    parseCourses: parseCourses,
    parseState: parseState,
    parseEvents: parseEvents,
    isDeadlineEvent: isDeadlineEvent,
    partitionDeadlines: partitionDeadlines,
    projectDeadlines: projectDeadlines,
    courseLabel: courseLabel,
    inspectIdentity: inspectIdentity,
    readSesskey: readSesskey,
    classifyAjaxError: classifyAjaxError,
    coursesCall: coursesCall,
    eventsCall: eventsCall,
    stateCall: stateCall,
    sanitizeProjection: sanitizeProjection,
  };
});
