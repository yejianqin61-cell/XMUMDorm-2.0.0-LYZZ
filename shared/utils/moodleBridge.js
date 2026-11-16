/**
 * Web 页面 ↔ 厦马小筑 Moodle 扩展（extension/）的消息协议，以及把 Moodle 截止投影进学习日历的纯函数。
 *
 * 安全口径（需求 docs/01-Requirement/Moodle浏览器扩展/ 验收 8）：
 *   - 只接受本窗口（event.source === window）、本 origin、命名空间 + 版本 + 请求 id 都对上的回复
 *   - 回复内容逐条清洗（id 形如 moodle:<课程>:<事件>、链接只认 l.xmu.edu.my 的 /mod/x/view.php?id=N）
 * 没装扩展（或手机浏览器）时请求会超时，返回 { installed: false }，页面照常工作。
 */

import { localYmd, DUE_SOON_DAYS } from './studyCalendar.js';
import { ymdToDayNumber } from '../config/semesters.js';

export const MOODLE_BRIDGE_NS = 'xmum-dorm-moodle';
export const MOODLE_BRIDGE_VERSION = 1;
const MOODLE_ORIGIN = 'https://l.xmu.edu.my';

function safeModuleUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.origin !== MOODLE_ORIGIN || url.username || url.password || url.hash) return null;
    if (!/^\/mod\/[a-z][a-z0-9_]*\/view\.php$/.test(url.pathname)) return null;
    const id = url.searchParams.get('id') || '';
    return /^[1-9]\d*$/.test(id) && url.search === `?id=${id}` ? url.href : null;
  } catch {
    return null;
  }
}

/** 扩展交来的列表逐条清洗（与 shared/moodle/moodle-core.js 的 sanitizeProjection 同口径） */
export function sanitizeMoodleItems(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (out.length >= 500) break;
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    if (typeof item.id !== 'string' || !/^moodle:\d+:\d+$/.test(item.id)) continue;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
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

const STATUSES = new Set(['ok', 'expired', 'denied', 'unavailable', 'invalid-data', 'unknown', 'empty']);

/**
 * 判断一条 message 事件是不是扩展对我们这次请求的回复；是就返回清洗后的结果，否则 null。
 * @param {MessageEvent} event
 * @param {{ id: string, win: Window }} expected
 */
export function acceptBridgeReply(event, { id, win }) {
  if (!event || event.source !== win || event.origin !== win.location.origin) return null;
  const data = event.data;
  if (!data || typeof data !== 'object') return null;
  if (data.ns !== MOODLE_BRIDGE_NS || data.v !== MOODLE_BRIDGE_VERSION || data.type !== 'reply' || data.id !== id) return null;
  return {
    installed: true,
    status: STATUSES.has(data.status) ? data.status : 'unknown',
    syncedAt: Number.isSafeInteger(data.syncedAt) && data.syncedAt > 0 ? data.syncedAt : null,
    items: sanitizeMoodleItems(data.items),
  };
}

/** 向扩展要数据；没装扩展时 timeoutMs 后返回 { installed: false } */
export function requestMoodleDeadlines({ win = typeof window !== 'undefined' ? window : null, timeoutMs = 800 } = {}) {
  if (!win || typeof win.postMessage !== 'function') return Promise.resolve({ installed: false, items: [] });
  const id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return new Promise((resolve) => {
    const onMessage = (event) => {
      const reply = acceptBridgeReply(event, { id, win });
      if (!reply) return;
      cleanup();
      resolve(reply);
    };
    const timer = setTimeout(() => { cleanup(); resolve({ installed: false, items: [] }); }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      win.removeEventListener('message', onMessage);
    }
    win.addEventListener('message', onMessage);
    win.postMessage({ ns: MOODLE_BRIDGE_NS, v: MOODLE_BRIDGE_VERSION, type: 'request', id }, win.location.origin);
  });
}

/** 截止时间按吉隆坡时区（UTC+8）落到哪一天 */
export function moodleDueYmd(dueAt) {
  return new Date(dueAt + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export function moodleDueTime(dueAt) {
  return new Date(dueAt + 8 * 3600 * 1000).toISOString().slice(11, 16);
}

/** 单条 Moodle 截止相对今天的状态（和待办同一套名字） */
export function moodleState(item, todayYmd = localYmd(), now = Date.now()) {
  if (item.done) return 'done';
  if (item.dueAt <= now) return 'overdue';
  const ymd = moodleDueYmd(item.dueAt);
  if (ymd === todayYmd) return 'today';
  const diff = ymdToDayNumber(ymd) - ymdToDayNumber(todayYmd);
  return diff <= DUE_SOON_DAYS ? 'soon' : 'later';
}

export function groupMoodleByDate(items) {
  const map = new Map();
  for (const item of items || []) {
    const ymd = moodleDueYmd(item.dueAt);
    if (!map.has(ymd)) map.set(ymd, []);
    map.get(ymd).push(item);
  }
  for (const list of map.values()) list.sort((a, b) => a.dueAt - b.dueAt);
  return map;
}

/** 「今天还有 N 项」里的 Moodle 部分：未完成的才算 */
export function summarizeMoodle(items, todayYmd = localYmd(), now = Date.now()) {
  const summary = { open: 0, overdue: 0, dueToday: 0, dueSoon: 0 };
  for (const item of items || []) {
    const state = moodleState(item, todayYmd, now);
    if (state === 'done') continue;
    summary.open += 1;
    if (state === 'overdue') summary.overdue += 1;
    else if (state === 'today') summary.dueToday += 1;
    else if (state === 'soon') summary.dueSoon += 1;
  }
  return summary;
}
