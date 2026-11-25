/**
 * 触感反馈的唯一入口（R4-11）。页面与组件只调 `tapFeedback`，⛔ 不直接 import `expo-haptics`。
 *
 * 用 `require` 延迟加载并整体兜底：旧的原生包里没有这个模块时静默不震，不能因此红屏；
 * 触感从来不是功能的一部分，任何失败都忽略。
 */
export type HapticKind = 'light' | 'select' | 'success';

export function tapFeedback(kind: HapticKind = 'light'): void {
  try {
    const Haptics = require('expo-haptics') as typeof import('expo-haptics');
    const pending =
      kind === 'success'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : kind === 'select'
          ? Haptics.selectionAsync()
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void pending?.catch(() => undefined);
  } catch {
    /* 没有原生模块：忽略 */
  }
}
