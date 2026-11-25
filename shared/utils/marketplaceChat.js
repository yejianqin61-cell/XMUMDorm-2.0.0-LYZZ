/**
 * 二手私信的纯函数（Web 聊天页、信箱私信列表共用；不依赖 React）。
 */

export const MARKETPLACE_CHAT_MAX_LEN = 1200;

function toTime(value) {
  if (value == null) return NaN;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * 把"更早的若干页"和"最新一页"合成一条按时间升序、按 id 去重的消息列表。
 * olderPages[0] 是紧挨着最新页的那一页，越往后越早；每页自身是升序。
 */
export function mergeChatPages(olderPages = [], latestList = []) {
  const ordered = [];
  for (let i = olderPages.length - 1; i >= 0; i -= 1) ordered.push(...(olderPages[i]?.list || []));
  ordered.push(...(latestList || []));
  const seen = new Set();
  const out = [];
  for (const m of ordered) {
    if (!m || m.id == null || seen.has(String(m.id))) continue;
    seen.add(String(m.id));
    out.push(m);
  }
  return out.sort((a, b) => {
    const d = toTime(a.created_at) - toTime(b.created_at);
    if (Number.isFinite(d) && d !== 0) return d;
    return Number(a.id) - Number(b.id);
  });
}

/** 下一次"查看更早消息"该用的游标；没有更早的了返回 null */
export function olderCursor(olderPages = [], latestPage = null) {
  const last = olderPages.length ? olderPages[olderPages.length - 1] : latestPage;
  if (!last || !last.hasMore) return null;
  return last.nextCursor || null;
}

/** 本地日期键，用于"今天 / 昨天 / 日期"分隔条 */
export function chatDayKey(value) {
  const t = toTime(value);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function chatDayLabel(value, isZh, now = new Date()) {
  const key = chatDayKey(value);
  if (!key) return '';
  if (key === chatDayKey(now)) return isZh ? '今天' : 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key === chatDayKey(y)) return isZh ? '昨天' : 'Yesterday';
  const d = new Date(toTime(value));
  const sameYear = d.getFullYear() === now.getFullYear();
  if (isZh) return sameYear ? `${d.getMonth() + 1}月${d.getDate()}日` : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString('en', sameYear ? { month: 'short', day: 'numeric' } : { year: 'numeric', month: 'short', day: 'numeric' });
}

/** 对方的已读时间 ≥ 这条消息的发送时间，就算对方读过了 */
export function isReadByPeer(message, peerLastReadAt) {
  const read = toTime(peerLastReadAt);
  const sent = toTime(message?.created_at);
  return Number.isFinite(read) && Number.isFinite(sent) && read >= sent;
}

/** 会话列表里的未读总数 */
export function sumUnread(threads = []) {
  return (threads || []).reduce((sum, t) => sum + (Number(t?.unread_count) || 0), 0);
}

export function itemStatusLabel(status, isZh) {
  if (status === 'sold') return isZh ? '已售出' : 'Sold';
  if (status === 'reserved') return isZh ? '已预订' : 'Reserved';
  return isZh ? '在售' : 'On sale';
}
