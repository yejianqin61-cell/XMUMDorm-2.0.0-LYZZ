/**
 * 万能墙滑窗状态机纯逻辑测试 — M09
 *
 * 覆盖设计文档 §7.2 的窗口规则与 §10 的相关边界条件。
 */
const {
  WINDOW_MAX,
  createWindowState,
  applyWindowPage,
  appendOlder,
  prependNewer,
  trimWindow,
  currentEntry,
  canGoNext,
  canGoPrev,
  move,
  jump,
  shouldPrefetch,
  patchEntry,
  removeEntry,
} = require('../../shared/utils/confessionWindow');

function page(ids, { hasOlder = false, hasNewer = false, total = ids.length } = {}) {
  return {
    items: ids.map((id) => ({ id, content: `c${id}` })),
    has_older: hasOlder,
    has_newer: hasNewer,
    total,
  };
}

describe('confessionWindow 滑窗状态机', () => {
  describe('applyWindowPage（首屏）', () => {
    it('按接口顺序写入 ids、entries，并把 index 置 0', () => {
      const s = applyWindowPage(createWindowState(), page([103, 102, 101], { hasOlder: true, total: 7 }));

      expect(s.ids).toEqual([103, 102, 101]);
      expect(s.index).toBe(0);
      expect(s.total).toBe(7);
      expect(s.hasOlder).toBe(true);
      expect(currentEntry(s).id).toBe(103);
    });

    it('空窗口不抛错且 index 保持 0', () => {
      const s = applyWindowPage(createWindowState(), { items: [], has_older: false, has_newer: false, total: 0 });

      expect(s.ids).toEqual([]);
      expect(currentEntry(s)).toBeNull();
      expect(canGoNext(s)).toBe(false);
      expect(canGoPrev(s)).toBe(false);
    });

    it('items 缺失或非法时安全降级', () => {
      expect(applyWindowPage(createWindowState(), {}).ids).toEqual([]);
      expect(applyWindowPage(createWindowState(), null).ids).toEqual([]);
    });
  });

  describe('appendOlder / prependNewer', () => {
    it('追加更旧的帖子到尾部', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102], { hasOlder: true }));
      s = appendOlder(s, page([101, 100], { hasOlder: false }));

      expect(s.ids).toEqual([103, 102, 101, 100]);
      expect(s.hasOlder).toBe(false);
      expect(s.index).toBe(0);
    });

    it('前插更新的帖子到头部，并将 index 整体后移', () => {
      let s = applyWindowPage(createWindowState(), page([102, 101], { hasNewer: true }));
      s = move(s, 'older').state; // index → 1（现在看 101）
      expect(s.index).toBe(1);

      s = prependNewer(s, page([104, 103], { hasNewer: false }));

      expect(s.ids).toEqual([104, 103, 102, 101]);
      // 仍然指向同一篇 101
      expect(s.ids[s.index]).toBe(101);
      expect(s.hasNewer).toBe(false);
    });

    it('重复 id 不会被重复插入', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102]));
      s = appendOlder(s, page([102, 101]));
      expect(s.ids).toEqual([103, 102, 101]);
    });
  });

  describe('move（翻页）', () => {
    it('窗口内部直接移动，无需补数据', () => {
      const s = applyWindowPage(createWindowState(), page([103, 102, 101]));
      const r = move(s, 'older');

      expect(r.moved).toBe(true);
      expect(r.needsLoad).toBeNull();
      expect(currentEntry(r.state).id).toBe(102);
    });

    it('已在窗口末尾且还有更旧内容 → 请求补数据', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102], { hasOlder: true }));
      s = move(s, 'older').state; // index → 1

      const r = move(s, 'older');
      expect(r.moved).toBe(false);
      expect(r.needsLoad).toBe('older');
    });

    it('已在窗口末尾且确实到头 → 不回弹请求', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102], { hasOlder: false }));
      s = move(s, 'older').state;

      const r = move(s, 'older');
      expect(r.moved).toBe(false);
      expect(r.needsLoad).toBeNull();
    });

    it('反向（更新）在窗口开头且还有更新内容 → 请求补数据', () => {
      const s = applyWindowPage(createWindowState(), page([103, 102], { hasNewer: true }));
      const r = move(s, 'newer');

      expect(r.moved).toBe(false);
      expect(r.needsLoad).toBe('newer');
    });

    it('空窗口翻页不抛错', () => {
      const r = move(createWindowState(), 'older');
      expect(r.moved).toBe(false);
      expect(r.needsLoad).toBeNull();
    });

    it('未知方向不产生动作', () => {
      const s = applyWindowPage(createWindowState(), page([103, 102]));
      const r = move(s, 'sideways');
      expect(r.moved).toBe(false);
      expect(r.state).toBe(s);
    });
  });

  describe('jump（Home / End）', () => {
    const s = applyWindowPage(createWindowState(), page([103, 102, 101]));

    it('first 跳到最新', () => {
      const moved = move(s, 'older').state;
      expect(jump(moved, 'first').index).toBe(0);
    });

    it('last 跳到最旧', () => {
      expect(jump(s, 'last').index).toBe(2);
    });

    it('空窗口或未知边界安全返回', () => {
      expect(jump(createWindowState(), 'first').index).toBe(0);
      expect(jump(s, 'unknown')).toBe(s);
    });
  });

  describe('trimWindow（窗口上限）', () => {
    it('未超上限时原样返回', () => {
      const s = applyWindowPage(createWindowState(), page([3, 2, 1]));
      expect(trimWindow(s)).toBe(s);
    });

    it('超出上限时裁剪，且当前下标仍指向同一篇', () => {
      // 构造 15 篇，当前停在下标 7
      const ids = Array.from({ length: 15 }, (_, i) => 100 - i);
      let s = applyWindowPage(createWindowState(), page(ids));
      s = { ...s, index: 7 };
      const currentId = s.ids[7];

      const trimmed = trimWindow(s);

      expect(trimmed.ids.length).toBe(WINDOW_MAX);
      expect(trimmed.ids[trimmed.index]).toBe(currentId);
    });

    it('裁剪后 entries 不残留已淘汰的 id', () => {
      const ids = Array.from({ length: 15 }, (_, i) => 100 - i);
      let s = applyWindowPage(createWindowState(), page(ids));
      s = { ...s, index: 14 }; // 停在最旧，应淘汰头部
      const trimmed = trimWindow(s);

      expect(Object.keys(trimmed.entries).length).toBe(WINDOW_MAX);
      expect(trimmed.entries[100]).toBeUndefined();
    });

    it('自定义 max 生效', () => {
      const s = applyWindowPage(createWindowState(), page([5, 4, 3, 2, 1]));
      expect(trimWindow(s, 3).ids.length).toBe(3);
    });
  });

  describe('shouldPrefetch（预取）', () => {
    it('接近尾部且还有更旧内容 → older', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102, 101], { hasOlder: true }));
      s = { ...s, index: 2 };
      expect(shouldPrefetch(s)).toBe('older');
    });

    it('接近头部且还有更新内容 → newer', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102, 101], { hasNewer: true }));
      s = { ...s, index: 0 };
      // 头部距离 0 ≤ 1 且 hasNewer → 优先返回 newer
      expect(shouldPrefetch(s)).toBe('newer');
    });

    it('窗口中部不预取', () => {
      let s = applyWindowPage(createWindowState(), page([107, 106, 105, 104, 103, 102, 101], { hasOlder: true, hasNewer: true }));
      s = { ...s, index: 3 };
      expect(shouldPrefetch(s)).toBeNull();
    });

    it('没有更多内容时不预取', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102, 101]));
      s = { ...s, index: 2 };
      expect(shouldPrefetch(s)).toBeNull();
    });

    it('空窗口不预取', () => {
      expect(shouldPrefetch(createWindowState())).toBeNull();
    });
  });

  describe('patchEntry / removeEntry', () => {
    it('patchEntry 只改目标条目', () => {
      const s = applyWindowPage(createWindowState(), page([103, 102]));
      const next = patchEntry(s, 102, { liked: true, like_count: 9 });

      expect(next.entries[102].liked).toBe(true);
      expect(next.entries[103].liked).toBeUndefined();
    });

    it('patchEntry 对不存在的 id 原样返回', () => {
      const s = applyWindowPage(createWindowState(), page([103]));
      expect(patchEntry(s, 999, { liked: true })).toBe(s);
    });

    it('removeEntry 移除条目并夹紧 index', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102, 101], { total: 3 }));
      s = { ...s, index: 2 }; // 停在 101

      const next = removeEntry(s, 101);

      expect(next.ids).toEqual([103, 102]);
      expect(next.index).toBe(1);
      expect(next.total).toBe(2);
      expect(next.entries[101]).toBeUndefined();
    });

    it('removeEntry 移除当前篇之前的条目时 index 前移以保持指向同一篇', () => {
      let s = applyWindowPage(createWindowState(), page([103, 102, 101]));
      s = { ...s, index: 2 }; // 101

      const next = removeEntry(s, 103); // 移除头部

      expect(next.ids).toEqual([102, 101]);
      expect(next.ids[next.index]).toBe(101);
    });

    it('removeEntry 对不存在的 id 原样返回', () => {
      const s = applyWindowPage(createWindowState(), page([103]));
      expect(removeEntry(s, 999)).toBe(s);
    });

    it('移除最后一篇后窗口为空且 index 归 0', () => {
      const s = applyWindowPage(createWindowState(), page([103]));
      const next = removeEntry(s, 103);

      expect(next.ids).toEqual([]);
      expect(next.index).toBe(0);
      expect(currentEntry(next)).toBeNull();
    });
  });
});
