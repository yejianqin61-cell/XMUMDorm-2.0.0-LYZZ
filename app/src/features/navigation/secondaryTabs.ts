/**
 * 二级导航（顶部 Tab 条）的**状态与集合声明** —— 纯逻辑，可单测。
 *
 * 宪法 4.8.1 六条硬规则的落地位置：
 *   R2 每个二级 Tab **独立维护**滚动位置 / 分页游标 / 筛选条件 → 本文件的 store
 *   R3 一级 Tab 切换**保留**各自的二级选中项 → 键是 `(一级格, 二级格)`
 *   R4 导航 Tab ≠ 筛选 Chips → 本文件只管"导航也选中的那个"，筛选状态是**另一条维度**（filters）
 *   R5 溢出横向滚动（不在这里，在组件层）；⛔ 不提供把子栏目藏起来的下拉入口
 *
 * ⚠️ 二级 Tab 的**具体集合**尚未拍板：
 *   - 「校园里」两项**已定**（宪法 4.1.1：树洞 / 万能墙，互斥、各自独立）
 *   - 广场 / 工具 / 我的 = TO-CONFIRM **C-03 / C-04 / C-05** → 这里只落**机制**，集合留空
 */

import type { MessageKey } from '@/i18n';

export type SecondaryTabKey = string;

export type SecondaryTabDefinition = {
  key: SecondaryTabKey;
  labelKey: MessageKey;
};

/** 一级格 → 该格的二级 Tab 集合（空数组 = 该格没有二级 Tab，不显示 Tab 条） */
export type SecondaryTabRegistry = Record<string, readonly SecondaryTabDefinition[]>;

export const SECONDARY_TABS: SecondaryTabRegistry = {
  // ✅ 已定：宪法 4.1.1（万能墙强制匿名、树洞非匿名 → 只允许导航层合并）
  campus: [
    { key: 'confession', labelKey: 'secondary.confession' },
    { key: 'wall', labelKey: 'secondary.wall' },
  ],
  // ⏳ 待确认 C-03：广场的二级集合（含"热搜 / 校园此刻"去哪里）
  square: [],
  // ⏳ 待确认 C-04：工具的二级集合
  tools: [],
  // ⏳ 待确认 C-05：我的是否也用二级 Tab
  me: [],
};

export function getSecondaryTabs(primaryTab: string): readonly SecondaryTabDefinition[] {
  return SECONDARY_TABS[primaryTab] ?? [];
}

/** 单个二级 Tab 的独立状态（R2） */
export type SecondaryTabState = {
  /** 滚动位置（像素） */
  scrollOffset: number;
  /** 分页游标（由数据层解释，这里只存） */
  cursor: string | null;
  /** 筛选条件（R4：与"选中哪个 Tab"是**两条不同维度**） */
  filters: Readonly<Record<string, string | readonly string[]>>;
};

export const EMPTY_SECONDARY_STATE: SecondaryTabState = {
  scrollOffset: 0,
  cursor: null,
  filters: {},
};

/**
 * 二级 Tab 状态仓库。
 * ⛔ 刻意做成**显式对象**而不是"页面里各写一个 useState"：
 *    否则"切走再切回位置还在"这条（R2）无法被证明，只能靠肉眼。
 */
export class SecondaryTabStore {
  private readonly states = new Map<string, SecondaryTabState>();

  private static key(primaryTab: string, secondaryTab: SecondaryTabKey): string {
    return `${primaryTab}::${secondaryTab}`;
  }

  get(primaryTab: string, secondaryTab: SecondaryTabKey): SecondaryTabState {
    return this.states.get(SecondaryTabStore.key(primaryTab, secondaryTab)) ?? EMPTY_SECONDARY_STATE;
  }

  update(
    primaryTab: string,
    secondaryTab: SecondaryTabKey,
    patch: Partial<SecondaryTabState>
  ): SecondaryTabState {
    const current = this.get(primaryTab, secondaryTab);
    const next: SecondaryTabState = { ...current, ...patch };
    this.states.set(SecondaryTabStore.key(primaryTab, secondaryTab), next);
    return next;
  }

  /** 切换二级 Tab **只改选中键**，不清任何状态（R2 的核心） */
  clear(): void {
    this.states.clear();
  }

  size(): number {
    return this.states.size;
  }
}

/** 动效参数未冻结（宪法 15.4）；`reduceMotion` 为真时**一律 0**（宪法 7.3） */
export function resolveTransitionDuration(reduceMotion: boolean, baseDuration: number): number {
  return reduceMotion ? 0 : baseDuration;
}

/**
 * **应用级实例**（P1-09 补）：R2（切走再切回位置/筛选还在）只有在**所有页面共享同一个实例**时
 * 才成立。⛔ 不要在页面里 `new SecondaryTabStore()` —— 各持一份 = 位置永远丢。
 * `K05 ListScreen` 通过 `scope` 读写它，⛔ 不新建第二套状态仓库（任务包纪律 4）。
 */
export const secondaryTabStore = new SecondaryTabStore();

/**
 * ⛔ R5：溢出时**必须**横向滚动，**不得**用下拉菜单把子栏目藏起来。
 * 这个守卫让"想加下拉"这件事在代码里变成显式失败。
 */
export function assertNoOverflowMenu(hasOverflowMenu: boolean): void {
  if (hasOverflowMenu) {
    throw new Error('⛔ 宪法 4.8.1-R5：子栏目溢出必须横向滚动，不得用下拉菜单隐藏');
  }
}
