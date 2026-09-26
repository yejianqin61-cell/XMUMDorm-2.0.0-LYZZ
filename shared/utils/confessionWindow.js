/**
 * 万能墙滑窗状态机 — 纯逻辑（无 React / DOM 依赖，便于单测）
 *
 * 设计文档：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §7.2
 *
 * 状态形状（全部为不可变更新，返回新对象）：
 *   {
 *     ids: number[],                  // 已加载的帖子 id，恒为「新 → 旧」
 *     entries: Object<number, post>,  // id → 帖子数据
 *     index: number,                  // 当前展示的下标
 *     hasOlder: boolean,              // 还能往更旧翻
 *     hasNewer: boolean,              // 还能往更新翻
 *     total: number,                  // 总篇数
 *   }
 *
 * 核心约束：窗口长度上限 WINDOW_MAX。超出后淘汰远离当前下标的一端，
 * 并相应修正 index，保证「当前位置」在淘汰后不发生视觉跳动。
 */

/** 窗口内最多缓存的帖子数 */
export const WINDOW_MAX = 12;

/** 创建初始空状态 */
export function createWindowState() {
  return { ids: [], entries: {}, index: 0, hasOlder: false, hasNewer: false, total: 0 };
}

/** 把接口返回的窗口数据合并进状态（首次加载或刷新） */
export function applyWindowPage(state, page) {
  const items = Array.isArray(page && page.items) ? page.items : [];
  const entries = {};
  items.forEach((item) => {
    if (item && item.id != null) entries[item.id] = item;
  });
  return {
    ...state,
    ids: items.map((i) => i.id),
    entries,
    index: 0,
    hasOlder: Boolean(page && page.has_older),
    hasNewer: Boolean(page && page.has_newer),
    total: Number(page && page.total) || 0,
  };
}

/** 把一批更旧的帖子**追加**到窗口尾部 */
export function appendOlder(state, page) {
  const items = Array.isArray(page && page.items) ? page.items : [];
  const entries = { ...state.entries };
  const existing = new Set(state.ids);
  const appended = [];
  items.forEach((item) => {
    if (!item || item.id == null) return;
    entries[item.id] = item;
    if (!existing.has(item.id)) {
      existing.add(item.id);
      appended.push(item.id);
    }
  });
  return {
    ...state,
    ids: [...state.ids, ...appended],
    entries,
    hasOlder: Boolean(page && page.has_older),
    total: Number(page && page.total) || state.total,
  };
}

/** 把一批更新的帖子**前插**到窗口头部，并整体后移 index */
export function prependNewer(state, page) {
  const items = Array.isArray(page && page.items) ? page.items : [];
  const entries = { ...state.entries };
  const existing = new Set(state.ids);
  const prepended = [];
  items.forEach((item) => {
    if (!item || item.id == null) return;
    entries[item.id] = item;
    if (!existing.has(item.id)) {
      existing.add(item.id);
      prepended.push(item.id);
    }
  });
  return {
    ...state,
    ids: [...prepended, ...state.ids],
    entries,
    index: state.index + prepended.length,
    hasNewer: Boolean(page && page.has_newer),
    total: Number(page && page.total) || state.total,
  };
}

/**
 * 淘汰远离当前下标的一端，直到窗口长度不超过 max。
 * 淘汰头部 N 条时 index 同步减 N；淘汰尾部不影响 index。
 */
export function trimWindow(state, max = WINDOW_MAX) {
  let { ids, entries, index } = state;
  if (ids.length <= max) return state;

  // 需要淘汰的总数
  let excess = ids.length - max;
  const kept = new Set(ids);

  // 优先淘汰离 index 更远的一端；距离相同则偏向淘汰头部（更新的一侧），
  // 因为用户更可能继续往「更旧」的方向翻。
  while (excess > 0) {
    const headDistance = index;
    const tailDistance = ids.length - 1 - index;
    if (tailDistance > headDistance) {
      // 尾部更远 → 丢尾部
      kept.delete(ids[ids.length - 1]);
      ids = ids.slice(0, -1);
    } else {
      // 头部更远（或相等）→ 丢头部，index 前移
      kept.delete(ids[0]);
      ids = ids.slice(1);
      index = Math.max(0, index - 1);
    }
    excess -= 1;
  }

  const nextEntries = {};
  ids.forEach((id) => {
    if (entries[id] !== undefined) nextEntries[id] = entries[id];
  });

  return { ...state, ids, entries: nextEntries, index: Math.min(index, Math.max(0, ids.length - 1)) };
}

/** 当前展示的帖子（窗口为空时返回 null） */
export function currentEntry(state) {
  if (!state || state.ids.length === 0) return null;
  return state.entries[state.ids[state.index]] || null;
}

/** 能否上翻（更旧） */
export function canGoNext(state) {
  return Boolean(state && state.index < state.ids.length - 1);
}

/** 能否下翻（更新） */
export function canGoPrev(state) {
  return Boolean(state && state.index > 0);
}

/**
 * 尝试移动到上/下一篇。
 * @returns {{state: Object, needsLoad: 'older'|'newer'|null, moved: boolean}}
 *   moved=false 且 needsLoad!=null 表示已到窗口边界，需要先补数据；
 *   moved=false 且 needsLoad=null 表示确实到头了（调用方应做回弹提示）。
 */
export function move(state, direction) {
  if (!state || state.ids.length === 0) {
    return { state, needsLoad: null, moved: false };
  }

  if (direction === 'older') {
    if (state.index < state.ids.length - 1) {
      return { state: { ...state, index: state.index + 1 }, needsLoad: null, moved: true };
    }
    // 已在窗口末尾
    return { state, needsLoad: state.hasOlder ? 'older' : null, moved: false };
  }

  if (direction === 'newer') {
    if (state.index > 0) {
      return { state: { ...state, index: state.index - 1 }, needsLoad: null, moved: true };
    }
    // 已在窗口开头
    return { state, needsLoad: state.hasNewer ? 'newer' : null, moved: false };
  }

  return { state, needsLoad: null, moved: false };
}

/** 跳到窗口最新 / 最旧 */
export function jump(state, edge) {
  if (!state || state.ids.length === 0) return state;
  if (edge === 'first') return { ...state, index: 0 };
  if (edge === 'last') return { ...state, index: state.ids.length - 1 };
  return state;
}

/**
 * 是否应当预取：当前下标距离窗口任一端 ≤ threshold 时预取。
 * @returns {'older'|'newer'|null}
 */
export function shouldPrefetch(state, threshold = 1) {
  if (!state || state.ids.length === 0) return null;
  const distanceToTail = state.ids.length - 1 - state.index;
  const distanceToHead = state.index;
  if (distanceToTail <= threshold && state.hasOlder) return 'older';
  if (distanceToHead <= threshold && state.hasNewer) return 'newer';
  return null;
}

/** 在窗口中就地更新某篇帖子的字段（点赞后使用） */
export function patchEntry(state, id, patch) {
  const existing = state.entries[id];
  if (!existing) return state;
  return {
    ...state,
    entries: { ...state.entries, [id]: { ...existing, ...patch } },
  };
}

/** 移除某篇（删除后使用），并把 index 夹回合法范围 */
export function removeEntry(state, id) {
  const idx = state.ids.indexOf(id);
  if (idx < 0) return state;
  const ids = state.ids.filter((x) => x !== id);
  const entries = { ...state.entries };
  delete entries[id];
  let index = state.index;
  if (idx < state.index) index -= 1;
  index = Math.max(0, Math.min(index, Math.max(0, ids.length - 1)));
  return {
    ...state,
    ids,
    entries,
    index,
    total: Math.max(0, state.total - 1),
  };
}
