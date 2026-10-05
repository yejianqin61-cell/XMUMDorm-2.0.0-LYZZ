/**
 * 返回策略（纯逻辑）—— R1 的"结论出来前不锁实现"落地
 *
 * 宪法 4.4 / 4.5：
 *   - 返回是**系统级行为**，⛔ **不得劫持** `KEYCODE_BACK`
 *   - 每个 Tab 各自独立返回栈；配置变更不丢状态
 *   - Android target 36 的"返回键直接退出 App"风险**必须真机验证**；**结论前不锁定实现**
 *
 * 所以本文件**只表达意图**（"这一下应该发生什么"），**不含任何平台 API**：
 * 平台侧怎么执行由导航容器决定（`expo-router` / 原生 Tabs）。
 * ⛔ 全仓**不得订阅系统返回键事件**（那等于劫持；有测试守着这条）。
 */

export type OverlayKind = 'publishCenter' | 'schoolSystem' | 'mailbox' | null;

export type BackContext = {
  /** 当前打开的覆盖层/推入式目的地（没有则为 null） */
  overlay: OverlayKind;
  /** 导航栈里还能不能退一步 */
  canGoBack: boolean;
  /** 是否已经在一级 Tab 的根（栈底） */
  atTabRoot: boolean;
};

export type BackAction =
  /** 关掉覆盖层本身；⛔ 底栏选中态不得改变（宪法 4.9.2-④） */
  | 'closeOverlay'
  /** 正常出栈（回到进入前的 Tab 与滚动位置） */
  | 'popStack'
  /** 交给系统：栈底再按一次由系统决定是否退出 App */
  | 'exitApp';

export function resolveBackAction(context: BackContext): BackAction {
  if (context.overlay !== null) {
    return 'closeOverlay';
  }
  if (context.canGoBack && !context.atTabRoot) {
    return 'popStack';
  }
  return 'exitApp';
}

/** 供 UI 用的一句话说明（用于"再按一次退出"这类提示；⛔ 不做说明性旁白，只给动作/状态） */
export function isExitIntent(context: BackContext): boolean {
  return resolveBackAction(context) === 'exitApp';
}
