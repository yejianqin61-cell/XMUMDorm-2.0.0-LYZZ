/**
 * 启动画面：保持与收起（阶段5-03；需求 A2-01b）
 *
 * 为什么需要这一层：原生启动画面（`app.json` 的 expo-splash-screen 插件）默认
 * **在 App「准备好」时就自动收起**。我们要的时机是「首帧已经提交到界面之后」——
 * 否则收起瞬间可能露出空白帧/闪一下；并且要在「减少动态效果」下不走淡出。
 *
 * 官方口径（SDK 57 · https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/）：
 * - `preventAutoHideAsync()` **必须在模块顶层调用**（在组件/hook 里调用可能太晚，启动画面已收起）；
 * - `hide()` 同步；`setOptions({ duration, fade })` 里 `fade` **仅 iOS 生效**；
 * - ⛔ 不要在这里做自绘启动动画（品牌素材未到，宪法 7.3；素材到位后再做）。
 *
 * 调用点只有根布局：顶层 `holdSplashScreen()` + 主题层内的 `<SplashRelease />`。
 * ⛔ 页面/其它组件不得再调用本模块（否则会出现第二个收起时机）。
 */

import * as React from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { useTheme } from '@/design-system/theme';

/** 淡出时长（ms）。仅在支持 `fade` 的平台可见；「减少动态效果」时归零 */
export const SPLASH_FADE_MS = 250;

/**
 * 顶层保持：让原生启动画面在 `SplashRelease` 收起之前一直可见。
 * ⚠️ 官方要求放在**模块顶层**，且不 await —— 这里只吞掉失败（启动不应因它中断）。
 */
export function holdSplashScreen(): void {
  void SplashScreen.preventAutoHideAsync().catch(() => {
    // 读不到原生模块/已自动收起都不影响启动：收起逻辑仍然是幂等的
  });
}

/** 收起前的动画参数：「减少动态效果」→ 不动画 */
export function configureSplashAnimation(reduceMotion: boolean): void {
  SplashScreen.setOptions({
    duration: reduceMotion ? 0 : SPLASH_FADE_MS,
    fade: !reduceMotion,
  });
}

/** 收起原生启动画面（幂等调用安全） */
export function releaseSplashScreen(): void {
  SplashScreen.hide();
}

/**
 * 收起时机组件：挂在主题层内（要读 `theme.reduceMotion`）。
 *
 * `useEffect` 在首帧提交之后执行 —— 这就是"首帧画好再收起"的落点，
 * 因此不需要额外的 rAF/超时；`released` 保证「减少动态效果」切换时不重复收起。
 */
export function SplashRelease(): null {
  const theme = useTheme();
  const released = React.useRef(false);

  React.useEffect(() => {
    configureSplashAnimation(theme.reduceMotion);
    if (released.current) return;
    released.current = true;
    releaseSplashScreen();
  }, [theme.reduceMotion]);

  return null;
}
