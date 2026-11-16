/**
 * Moodle 浏览器扩展（任务管理表 #6）：核心解析、DDL 判定、扩展同步脚本与权限
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const core = require('../../shared/moodle/moodle-core');

const root = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

const NOW = Date.UTC(2026, 10, 16, 4, 0, 0); // 2026-11-16 12:00 吉隆坡
const sec = (ms) => Math.floor(ms / 1000);
const DAY = 86400000;

// 校方 Moodle 4.5 实站形状（state 的 id 是字符串、整个 state 是 JSON 字符串）
const COURSES_RAW = { courses: [
  { id: 101, fullname: 'EEE203 Signals', fullnamedisplay: 'EEE203 Signals and Systems', shortname: 'EEE203', visible: true },
  { id: 102, fullname: 'Hidden', visible: false },
], nextoffset: 2 };
const STATE_RAW = JSON.stringify({ course: { id: '101' }, cm: [
  { id: '11', module: 'assign', name: 'Lab 3 report', url: 'https://l.xmu.edu.my/mod/assign/view.php?id=11', visible: true, uservisible: true, completionstate: '0', isoverallcomplete: false },
  { id: '12', module: 'quiz', name: 'Quiz 2', url: 'https://l.xmu.edu.my/mod/quiz/view.php?id=12', visible: true, uservisible: true },
  { id: '13', module: 'forum', name: 'Announcements', url: 'https://l.xmu.edu.my/mod/forum/view.php?id=13', visible: true, uservisible: true },
  { id: '14', module: 'assign', name: 'Lab 1 report', url: 'https://l.xmu.edu.my/mod/assign/view.php?id=14', visible: true, uservisible: true, completionstate: '1', isoverallcomplete: true },
] });
const ev = (id, cmid, type, eventtype, time, actionable = true) => ({
  id, name: `event ${id}`, timesort: time, eventtype, course: { id: 101 },
  url: `https://l.xmu.edu.my/mod/${type}/view.php?id=${cmid}`, action: { name: 'x', actionable },
});
const EVENTS_RAW = { events: [
  ev(901, 11, 'assign', 'due', sec(NOW + 5 * DAY)),
  ev(902, 12, 'quiz', 'close', sec(NOW + 2 * DAY)),
  ev(903, 13, 'forum', 'due', sec(NOW + 1 * DAY)), // 论坛不算 DDL
  ev(904, 14, 'assign', 'due', sec(NOW - 3 * DAY), false), // 已交
  ev(905, 12, 'quiz', 'open', sec(NOW + 1 * DAY)), // quiz 的 open 不是截止
  { ...ev(906, 11, 'assign', 'due', sec(NOW + 6 * DAY)), url: 'https://evil.example/mod/assign/view.php?id=11' },
], firstid: 901, lastid: 906 };

describe('解析', () => {
  it('课程：跳过隐藏课程，优先显示名', () => {
    expect(core.parseCourses(COURSES_RAW)).toEqual({ courses: [{ id: 101, name: 'EEE203 Signals and Systems', shortName: 'EEE203' }], nextOffset: 2 });
    expect(core.parseCourses({})).toBeNull();
  });
  it('课程状态：字符串 id、完成状态', () => {
    const state = core.parseState(STATE_RAW);
    expect(state.courseId).toBe(101);
    expect(state.modules).toHaveLength(4);
    expect(state.modules[3].completion).toEqual({ state: 1, complete: true });
    expect(core.parseState('not json')).toBeNull();
  });
  it('事件：外域链接被丢掉（url=null）', () => {
    const { events, lastId } = core.parseEvents(EVENTS_RAW);
    expect(lastId).toBe(906);
    expect(events.find((e) => e.id === 906).url).toBeNull();
    expect(events.find((e) => e.id === 901).url).toBe('https://l.xmu.edu.my/mod/assign/view.php?id=11');
  });
  it('safeUrl 只留白名单参数、去掉 hash', () => {
    expect(core.safeUrl('https://l.xmu.edu.my/mod/assign/view.php?id=11&sesskey=abc#x')).toBe('https://l.xmu.edu.my/mod/assign/view.php?id=11');
    expect(core.safeUrl('https://user:pw@l.xmu.edu.my/')).toBeNull();
    expect(core.safeModuleUrl('https://l.xmu.edu.my/course/view.php?id=1')).toBeNull();
  });
});

describe('DDL 判定与投影', () => {
  const state = core.parseState(STATE_RAW);
  const { events } = core.parseEvents(EVENTS_RAW);
  const buckets = core.partitionDeadlines([state], events, NOW);

  it('只认 assign due / quiz close / expectcompletionon，且链接必须完全对上', () => {
    expect(buckets.valid.map((d) => d.event.id)).toEqual([902, 901]);
    expect(buckets.past.map((d) => d.event.id)).toEqual([904]);
  });

  it('投影只含标题、课程名、截止时间、链接、是否完成；已交的标记 done', () => {
    const items = core.projectDeadlines(buckets, core.parseCourses(COURSES_RAW).courses, NOW);
    expect(items).toEqual([
      { id: 'moodle:101:904', title: 'Lab 1 report', courseName: 'EEE203', dueAt: sec(NOW - 3 * DAY) * 1000, url: 'https://l.xmu.edu.my/mod/assign/view.php?id=14', done: true },
      { id: 'moodle:101:902', title: 'Quiz 2', courseName: 'EEE203', dueAt: sec(NOW + 2 * DAY) * 1000, url: 'https://l.xmu.edu.my/mod/quiz/view.php?id=12', done: false },
      { id: 'moodle:101:901', title: 'Lab 3 report', courseName: 'EEE203', dueAt: sec(NOW + 5 * DAY) * 1000, url: 'https://l.xmu.edu.my/mod/assign/view.php?id=11', done: false },
    ]);
  });

  it('超过 30 天的过去截止不交给 Web', () => {
    const old = core.partitionDeadlines([state], [{ ...events[0], time: sec(NOW - 40 * DAY) }], NOW);
    expect(core.projectDeadlines(old, [], NOW)).toEqual([]);
  });
});

describe('课程显示名（按校方真实课程名的写法）', () => {
  it.each([
    [{ name: '(2026-09)-DATA STRUCTURES(EEE211)', shortName: 'EEE211*_2' }, 'EEE211'],
    [{ name: 'EEE 202 Engineers and Society 2026/09 Dr X', shortName: 'Enginers and Society' }, 'EEE202'],
    [{ name: 'COM210 and COM211 Engineering Mathematics (III) 2026/09 Y', shortName: 'EMath' }, 'COM210'],
    [{ name: 'EEE203 Instrumentation 2026/09 Z', shortName: 'EEE2032609Z' }, 'EEE203'],
    [{ name: 'Library Orientation for New Students', shortName: 'LIB' }, 'Library Orientation for New Students'],
    [{ name: 'A very long course title without any recognisable course code at all', shortName: null }, 'A very long course title without any re…'],
  ])('%o → %s', (course, label) => {
    expect(core.courseLabel(course)).toBe(label);
  });
});

describe('页面信息', () => {
  const fakeDoc = (map) => ({ querySelector: (sel) => (map[sel] ? { getAttribute: () => map[sel] } : null) });
  it('登录态与用户 id', () => {
    expect(core.inspectIdentity(fakeDoc({ '#user-menu-toggle': 'x', '#usernavigation [data-userid]': '4321' }))).toEqual({ status: 'confirmed', userId: 4321 });
    expect(core.inspectIdentity(fakeDoc({ 'input[type=password]': 'x' }))).toEqual({ status: 'logged-out' });
    expect(core.inspectIdentity(fakeDoc({ '#user-menu-toggle': 'x', '#usernavigation [data-userid]': 'abc' }))).toEqual({ status: 'unknown' });
  });
  it('从内联 M.cfg 读 sesskey', () => {
    expect(core.readSesskey('<script>M.cfg = {"wwwroot":"https:\\/\\/l.xmu.edu.my","sesskey":"AbC123xyz","x":1};</script>')).toBe('AbC123xyz');
    expect(core.readSesskey('<html></html>')).toBeNull();
  });
  it('AJAX 错误码分类', () => {
    expect(core.classifyAjaxError({ exception: { errorcode: 'servicerequireslogin' } })).toBe('expired');
    expect(core.classifyAjaxError({ exception: { errorcode: 'nopermissions' } })).toBe('denied');
    expect(core.classifyAjaxError({})).toBe('unavailable');
  });
});

describe('扩展打包与权限', () => {
  it('extension/lib 里的副本和 shared 里的一致（改了要跑 npm run extension:sync-core）', () => {
    expect(read('extension', 'lib', 'moodle-core.js')).toBe(read('shared', 'moodle', 'moodle-core.js'));
  });
  it('权限最小：只有 storage；只能访问 l.xmu.edu.my；没有 cookies', () => {
    const manifest = JSON.parse(read('extension', 'manifest.json'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toEqual(['https://l.xmu.edu.my/*']);
    expect(JSON.stringify(manifest)).not.toMatch(/cookies|webRequest|<all_urls>/);
  });
  it('桥接脚本的命名空间、版本与核心一致', () => {
    const bridge = read('extension', 'dorm-bridge.js');
    expect(bridge).toContain(`var NS = '${core.BRIDGE_NS}'`);
    expect(bridge).toContain(`var VERSION = ${core.BRIDGE_VERSION}`);
  });
});

describe('扩展同步脚本（模拟浏览器环境）', () => {
  function run({ replies, identity = { '#user-menu-toggle': 'x', '#usernavigation [data-userid]': '77' } }) {
    const store = {};
    const calls = [];
    const fetch = jest.fn(async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      const reply = replies.shift();
      return { ok: true, json: async () => reply };
    });
    const chrome = {
      storage: { local: {
        get: (keys, cb) => { const out = {}; for (const k of [].concat(keys)) if (k in store) out[k] = store[k]; cb(out); },
        set: (values, cb) => { Object.assign(store, values); cb && cb(); },
      } },
      runtime: { onMessage: { addListener: () => {} } },
    };
    const document = {
      querySelector: (sel) => (identity[sel] ? { getAttribute: () => identity[sel] } : null),
      documentElement: { innerHTML: '<script>M.cfg={"sesskey":"SESS123abc"}</script>' },
    };
    const ctx = vm.createContext({ chrome, fetch, document, URL, Date: class extends Date { static now() { return NOW; } }, Promise, console });
    vm.runInContext(read('extension', 'lib', 'moodle-core.js'), ctx);
    vm.runInContext(read('extension', 'moodle-sync.js'), ctx);
    return { store, calls };
  }
  const flush = () => new Promise((r) => setTimeout(r, 20));

  it('两个批次：先课程 + 事件，再只取有截止事件的课程状态；结果存本机', async () => {
    const { store, calls } = run({ replies: [
      [{ error: false, data: COURSES_RAW }, { error: false, data: EVENTS_RAW }],
      [{ error: false, data: STATE_RAW }],
    ] });
    await flush();
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain('https://l.xmu.edu.my/lib/ajax/service.php?sesskey=SESS123abc');
    expect(calls[0].body.map((c) => c.methodname)).toEqual(['core_course_get_enrolled_courses_by_timeline_classification', 'core_calendar_get_action_events_by_timesort']);
    expect(calls[1].body).toEqual([{ index: 0, methodname: 'core_courseformat_get_state', args: { courseid: 101 } }]);
    expect(store['moodle:active']).toBe(77);
    const entry = store['moodle:user:77'];
    expect(entry.status).toBe('ok');
    expect(entry.items.map((i) => i.id)).toEqual(['moodle:101:904', 'moodle:101:902', 'moodle:101:901']);
    expect(JSON.stringify(store)).not.toContain('SESS123abc');
  });

  it('会话过期：标记 expired，保留上次数据', async () => {
    const { store } = run({ replies: [{ error: true, exception: { errorcode: 'servicerequireslogin' } }] });
    await flush();
    expect(store['moodle:user:77'].status).toBe('expired');
  });

  it('没登录的页面不发请求', async () => {
    const { calls } = run({ replies: [], identity: { 'input[type=password]': 'x' } });
    await flush();
    expect(calls).toHaveLength(0);
  });
});
