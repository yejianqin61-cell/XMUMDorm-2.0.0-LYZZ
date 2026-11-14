/**
 * 学习进度存档。
 *
 * 存档结构沿用上游（v=2），语义保持一致：
 *   { v, xp, streak, hearts, gems, goal, todayXp, lastDay,
 *     done: { lessonId: { xp, at } }, unitsSeen, vocabKnown, ach,
 *     lessonsDone, stats: { items, confuse }, sync: { updatedAt } }
 *
 * 两条安全不变量：
 *   1. 导出的备份文件不含任何同步码 / 后端地址 / 共享密钥；
 *   2. 存档解析失败时先备份原文再回退，绝不静默丢数据。
 *
 * 存档键：优先用 XMUMDorm 前缀的新键；读不到时回落到上游的 melayu_duolingo_v1，
 * 这样从独立站点迁移过来的学习进度能平滑接上。
 */
export const STORE_KEY = 'xmumdorm_malay_v1';
export const LEGACY_STORE_KEY = 'melayu_duolingo_v1';

export function defaultState() {
  return {
    v: 2,
    xp: 0,
    streak: 0,
    hearts: 5,
    gems: 0,
    goal: 20,
    todayXp: 0,
    lastDay: '',
    done: {},
    unitsSeen: {},
    vocabKnown: {},
    ach: {},
    lessonsDone: 0,
    stats: { items: {}, confuse: {} },
    sync: { updatedAt: 0 },
  };
}

/** localStorage 是否可用（隐私模式 / 被禁用 / 超配额） */
export function storageOK() {
  try {
    localStorage.setItem('__malay_probe__', '1');
    localStorage.removeItem('__malay_probe__');
    return true;
  } catch {
    return false;
  }
}

/** 版本迁移 + 字段兜底：老数据缺字段时补齐，绝不因缺字段崩溃 */
export function migrate(s) {
  const d = defaultState();
  const out = Object.assign({}, d, s && typeof s === 'object' ? s : {});
  const num = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : dflt);
  out.xp = num(out.xp, 0);
  out.streak = num(out.streak, 0);
  out.gems = num(out.gems, 0);
  out.goal = num(out.goal, 20);
  out.todayXp = num(out.todayXp, 0);
  out.hearts = Math.max(0, Math.min(5, num(out.hearts, 5)));
  out.lessonsDone = num(out.lessonsDone, 0);
  out.lastDay = typeof out.lastDay === 'string' ? out.lastDay : '';
  out.done = out.done && typeof out.done === 'object' ? out.done : {};
  out.unitsSeen = out.unitsSeen && typeof out.unitsSeen === 'object' ? out.unitsSeen : {};
  out.vocabKnown = out.vocabKnown && typeof out.vocabKnown === 'object' ? out.vocabKnown : {};
  out.ach = out.ach && typeof out.ach === 'object' ? out.ach : {};
  out.stats = out.stats && typeof out.stats === 'object' ? out.stats : { items: {}, confuse: {} };
  out.stats.items = out.stats.items && typeof out.stats.items === 'object' ? out.stats.items : {};
  out.stats.confuse = out.stats.confuse && typeof out.stats.confuse === 'object' ? out.stats.confuse : {};
  // 同步配置（同步码 / 后端地址 / 共享密钥）只属于设备配置，绝不写进进度存档，
  // 否则导出的备份会把密钥一起带出去；历史存档里已有的也一并抹掉。
  out.sync = { updatedAt: num(out.sync && out.sync.updatedAt, 0) };
  out.v = 2;
  return out;
}

/** 读取存档。返回 { state, broken }，broken 表示原始数据损坏并已备份 */
export function loadProgress() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORE_KEY);
    if (!raw) raw = localStorage.getItem(LEGACY_STORE_KEY);
  } catch {
    raw = null;
  }
  let s = null;
  let broken = false;
  if (raw) {
    try {
      s = JSON.parse(raw);
    } catch {
      // 数据损坏：先备份原文再回退，绝不静默丢数据
      try {
        localStorage.setItem(STORE_KEY + '_broken_' + Date.now(), raw);
      } catch {
        /* 备份失败也不能挡住流程 */
      }
      broken = true;
      s = null;
    }
  }
  return { state: migrate(s), broken };
}

/** 保存：任何异常都不允许打断业务流程，只记录状态 */
export function saveProgress(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** 清空进度 */
export function resetProgress() {
  try {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(LEGACY_STORE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 导出用的纯学习进度：剔除 sync（含同步码 / 地址 / 密钥）。
 * 备份文件分享出去时不能把密钥带出去。
 */
export function exportableState(state) {
  const copy = JSON.parse(JSON.stringify(state));
  delete copy.sync;
  return copy;
}

/**
 * 记录一次作答：进入错题本 / 易混淆 / 间隔复习统计。
 * 与上游 app.js 的 App.recordAnswer 语义一致：
 *   - 答对：box = min(5, box + 1)，下次到期 = now + [0,1,2,4,7,15][box] 天
 *   - 答错：box = 0，立即到期；且 chosenMs 与 ms 不同才记一条易混淆
 */
export function recordAnswer(stats, ms, correct, chosenMs, kind, nowMs) {
  if (!ms || !stats) return;
  if (!stats.items) stats.items = {};
  if (!stats.confuse) stats.confuse = {};
  const now = typeof nowMs === 'number' && isFinite(nowMs) ? nowMs : Date.now();
  const it = stats.items[ms] || (stats.items[ms] = { seen: 0, right: 0, wrong: 0, lastAt: 0, box: 0, dueAt: 0 });
  it.seen = (it.seen || 0) + 1;
  it.lastAt = now;
  if (correct) {
    it.right = (it.right || 0) + 1;
    it.box = Math.min(5, (it.box || 0) + 1);
    const days = [0, 1, 2, 4, 7, 15][it.box] || 15;
    it.dueAt = now + days * 86400000;
  } else {
    it.wrong = (it.wrong || 0) + 1;
    it.box = 0;
    it.dueAt = now;
    if (chosenMs && chosenMs !== ms) {
      const k = ms + '|' + chosenMs;
      const c = stats.confuse[k] || (stats.confuse[k] = { n: 0, lastAt: 0 });
      c.n = (c.n || 0) + 1;
      c.lastAt = now;
    }
  }
  if (kind) it.kind = kind;
}

/** 克隆 stats，供 React 状态更新时保持不可变 */
export function cloneStats(stats) {
  const src = stats || { items: {}, confuse: {} };
  const items = {};
  Object.keys(src.items || {}).forEach((k) => {
    items[k] = Object.assign({}, src.items[k]);
  });
  const confuse = {};
  Object.keys(src.confuse || {}).forEach((k) => {
    confuse[k] = Object.assign({}, src.confuse[k]);
  });
  return { items, confuse };
}

/** 今日日期（YYYY-MM-DD） */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** 昨天日期（YYYY-MM-DD） */
export function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
