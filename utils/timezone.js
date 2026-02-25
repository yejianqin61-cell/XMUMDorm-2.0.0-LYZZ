/**
 * 东八区（Asia/Shanghai）时间工具
 * 用于排行榜：每周一 0 点重置、爆款新品 7 天计算
 */

/** 当前东八区时间的 Date 等价（用 UTC+8 偏移算） */
function nowInShanghai() {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 60 * 60 * 1000);
}

/** 是否东八区周一 0 点～0 点 59 分（用于每周重置） */
function isMondayZeroInShanghai() {
  const sh = nowInShanghai();
  return sh.getDay() === 1 && sh.getHours() === 0;
}

/** 东八区当前时间字符串 YYYY-MM-DD HH:mm:ss（便于日志） */
function shanghaiDateString() {
  const sh = nowInShanghai();
  const y = sh.getFullYear();
  const m = String(sh.getMonth() + 1).padStart(2, '0');
  const d = String(sh.getDate()).padStart(2, '0');
  const h = String(sh.getHours()).padStart(2, '0');
  const min = String(sh.getMinutes()).padStart(2, '0');
  const s = String(sh.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

/** 东八区「距今 N 个自然日」的 0 点时间戳（用于 SQL：created_at >= 该时间 即 7 天内） */
function shanghaiDaysAgoStart(days) {
  const sh = nowInShanghai();
  sh.setDate(sh.getDate() - days);
  sh.setHours(0, 0, 0, 0);
  const utc = sh.getTime() - 8 * 60 * 60 * 1000;
  return new Date(utc);
}

module.exports = {
  nowInShanghai,
  isMondayZeroInShanghai,
  shanghaiDateString,
  shanghaiDaysAgoStart
};
