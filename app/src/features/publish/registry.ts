/**
 * 发布注册表 —— 发布中心的**唯一数据源**（宪法 4.9.5）
 *
 * 这是第三轮裁决里最重要的一条结构性要求：发布类型会**持续增加**（所有者已预告拼车 / 问答）。
 * 因此：
 *   ✅ **新增一类发布 = 本文件加一条**
 *   ⛔ 不改导航壳、不改布局、不改底栏
 *   ⛔ 不得把七类动作硬编码成七个按钮
 *
 * 四条硬纪律（骨架规范 §3.5）：
 *   1. **一一对应**：注册表里有 route ⇒ 路由存在；路由存在但没注册 ⇒ **不许出现在界面上**
 *   2. **权限过滤由后端布尔字段驱动**（`viewer.*`），⛔ UI 不得自行推断
 *   3. **入口唯一**：只有第 5 格 + 注册表条目（4.9.3）
 *   4. **合规门禁**（A-05）挂在**每个发布表单的提交链路**上，见 `complianceGate.ts`
 */

import type { MessageKey } from '@/i18n';

/** 发布类型 id（也是表单路由的参数段） */
export type PublishId =
  | 'wall'
  | 'confession'
  | 'clubActivity'
  | 'marketplace'
  | 'errand'
  | 'carpool'
  | 'qa';

/**
 * 观看者能力 —— **全部来自后端的布尔字段**（4.9.5-3）。
 * ⛔ 不得在这里出现任何本地推断（如"发帖数 > 3 就能发活动"）。
 */
export type Viewer = {
  signedIn: boolean;
  /** 后端字段：能否管理某个社团（决定"社团活动"是否可见） */
  canManageClub?: boolean;
  /** 后端字段：是否是某组织成员 */
  isOrgMember?: boolean;
  /** A-05：是否已接受用户政策（决定能否**提交**，不决定条目是否可见） */
  acceptedTerms?: boolean;
};

/** 表单承载路由：**一条动态路由**承载所有发布表单（宪法 9.2 的参数化框架） */
export const PUBLISH_FORM_ROUTE_PATTERN = '/publish/[type]';

export function formRouteFor(id: PublishId): string {
  return `/publish/${id}`;
}

export type PublishEntry = {
  id: PublishId;
  titleKey: MessageKey;
  /** Lucide 逐图标子路径名（宪法 16.5-1；⛔ 禁 barrel） */
  icon: string;
  /** 后端布尔驱动的可见性 */
  permission: (viewer: Viewer) => boolean;
  /** `ready` = 可以发布；`planned` = 后端未建（⛔ 永不显示，4.9.5-4） */
  status: 'ready' | 'planned';
};

/** 已登录即可（三条通用发布） */
const signedInOnly = (viewer: Viewer): boolean => viewer.signedIn === true;

export const PUBLISH_REGISTRY: readonly PublishEntry[] = [
  {
    id: 'wall',
    titleKey: 'publish.entry.wall',
    icon: 'megaphone',
    permission: signedInOnly,
    status: 'ready',
  },
  {
    id: 'confession',
    titleKey: 'publish.entry.confession',
    icon: 'ghost',
    permission: signedInOnly,
    status: 'ready',
  },
  {
    id: 'clubActivity',
    titleKey: 'publish.entry.clubActivity',
    icon: 'users',
    // 后端字段驱动（⛔ 不猜）
    permission: (viewer) => viewer.canManageClub === true,
    status: 'ready',
  },
  {
    id: 'marketplace',
    titleKey: 'publish.entry.marketplace',
    icon: 'shopping-bag',
    permission: signedInOnly,
    status: 'ready',
  },
  {
    id: 'errand',
    titleKey: 'publish.entry.errand',
    icon: 'bike',
    permission: signedInOnly,
    status: 'ready',
  },
  {
    // 所有者预告的两类，**后端 0 表 0 端点** → 登记在 TODO TD-01
    id: 'carpool',
    titleKey: 'publish.entry.carpool',
    icon: 'car',
    permission: signedInOnly,
    status: 'planned',
  },
  {
    // 同上：TODO TD-02（注意"问答 ≠ 树洞"，定义待定）
    id: 'qa',
    titleKey: 'publish.entry.qa',
    icon: 'circle-question-mark',
    permission: signedInOnly,
    status: 'planned',
  },
];

/**
 * 可见条目 = **权限通过** 且 **不是 planned**。
 * ⛔ planned 条目**永不显示**（含灰度/占位）；权限不足的条目也不显示为"禁用"占位。
 */
export function visibleEntries(viewer: Viewer): readonly PublishEntry[] {
  return PUBLISH_REGISTRY.filter((entry) => entry.status === 'ready' && entry.permission(viewer));
}

export function getPublishEntry(id: PublishId): PublishEntry | undefined {
  return PUBLISH_REGISTRY.find((entry) => entry.id === id);
}

/**
 * 注册表不变量（构建期/测试期跑）。任一不满足即抛 —— 让"注册表烂掉"在合并前失败。
 */
export function assertRegistryInvariants(dictionaryKeys: readonly string[]): void {
  const ids = PUBLISH_REGISTRY.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('发布注册表 id 重复');
  }

  const titleKeys = PUBLISH_REGISTRY.map((entry) => entry.titleKey);
  if (new Set(titleKeys).size !== titleKeys.length) {
    throw new Error('发布注册表 titleKey 重复（一改全改的语义会歧义）');
  }

  for (const entry of PUBLISH_REGISTRY) {
    if (!dictionaryKeys.includes(entry.titleKey)) {
      throw new Error(`发布注册表 titleKey 在词条表里不存在：${entry.titleKey}`);
    }
    if (!entry.icon || entry.icon.includes('/')) {
      // 只接受裸 kebab-case 名：导入语句由调用方按 `lucide-react-native/icons/<name>` 拼
      throw new Error(`发布条目 ${entry.id} 的图标名不合法：${entry.icon}`);
    }
  }

  // 入口唯一：注册表里不得出现"指向非发布表单"的 route
  for (const entry of PUBLISH_REGISTRY) {
    const route = formRouteFor(entry.id);
    if (!route.startsWith('/publish/')) {
      throw new Error(`发布条目 ${entry.id} 的表单路由不在 /publish/ 下`);
    }
  }
}

/**
 * 一致性校验：**已实现的发布表单路由**必须都在注册表里（⛔ 反向：有路由没注册 = 页面上不得出现）。
 * Phase 0 只有一条动态承载路由，故这里只校验模式。
 */
export function assertFormRoutesCovered(implementedRoutePatterns: readonly string[]): void {
  const unexpected = implementedRoutePatterns.filter(
    (pattern) => pattern !== PUBLISH_FORM_ROUTE_PATTERN
  );
  if (unexpected.length > 0) {
    throw new Error(`存在未注册的发布表单路由：${unexpected.join(', ')}`);
  }
}
