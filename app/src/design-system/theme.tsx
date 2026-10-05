/**
 * 主题层 —— 令牌 → 主题对象
 *
 * 三条纪律：
 * 1. **视觉取值只能来自令牌**：主题对象是组件消费令牌的**唯一入口**（宪法 1.4）。
 * 2. **暗色不是亮色的翻转**：两套令牌各自有独立的实测对比度（宪法 2.3），本层只做选择，不做推导。
 * 3. **`colorScheme` 显式**：⛔ 不用 `'unspecified'`（宪法 9.12-②）；系统值只是**默认**，
 *    允许被设置页的"深色 / 浅色 / 跟随系统"三态覆盖。
 */

import * as React from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import {
  colors,
  colorsFor,
  scale,
  type ColorToken,
  type TokenTheme,
} from './tokens';
import {
  borderWidth,
  iconSize,
  motionDuration,
  px,
  radius,
  space,
} from './px';

/** 主题解析来源：跟随系统，或显式锁定（宪法 9.12-②） */
export type ThemeSource = TokenTheme | 'system';

export type Theme = {
  /** 实际生效的配色方案 */
  scheme: TokenTheme;
  /** 语义色令牌表（业务代码只允许从这里取色，⛔ 不按调色板档位取） */
  color: Readonly<Record<string, ColorToken>>;
  /** 非颜色令牌（已转成 RN 需要的 number） */
  space: typeof space;
  radius: typeof radius;
  /** 图标尺寸档位（P1-04：宪法 16.3 只接受档位，⛔ 不写裸数字） */
  iconSize: typeof iconSize;
  borderWidth: typeof borderWidth;
  motionDuration: typeof motionDuration;
  /** 触控目标下限：iOS ≥44pt / Android ≥48dp（宪法 7.1，⛔ 不取交集） */
  touchTarget: number;
  /** 系统"减弱动态效果"是否开启（宪法 7.3：每条动效都必须声明降级） */
  reduceMotion: boolean;
};

const touchTargetByPlatform = Platform.select({
  ios: scale.touchTarget.touch_target_ios,
  default: scale.touchTarget.touch_target_android,
});

function buildTheme(scheme: TokenTheme, reduceMotion: boolean): Theme {
  return {
    scheme,
    color: colorsFor(scheme),
    space,
    radius,
    iconSize,
    borderWidth,
    motionDuration,
    touchTarget: px(touchTargetByPlatform),
    reduceMotion,
  };
}

const ThemeContext = React.createContext<Theme | null>(null);

export type ThemeProviderProps = {
  /** 默认跟随系统；设置页可显式锁定 */
  source?: ThemeSource;
  /** 系统配色（由根布局从 `useColorScheme()` 传入，⛔ 本层不自己读，便于测试与单一真源） */
  systemScheme?: TokenTheme | null;
  children: React.ReactNode;
};

export function ThemeProvider({
  source = 'system',
  systemScheme = null,
  children,
}: ThemeProviderProps): React.ReactElement {
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        // 读不到就按"未开启"处理：⛔ 不让一个可选的辅助功能读值把首屏打白
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const scheme: TokenTheme =
    source === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : source;

  const value = React.useMemo(() => buildTheme(scheme, reduceMotion), [scheme, reduceMotion]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** 读主题。⛔ 页面不得再自己造一套令牌读取路径 —— 没有 Provider 就抛（早失败优于静默错色） */
export function useTheme(): Theme {
  const theme = React.useContext(ThemeContext);
  if (theme === null) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用：令牌只能来自唯一主题层');
  }
  return theme;
}

/** 供非组件代码（如测试）构造主题对象 */
export const __internal = { buildTheme, themeTokenNames: () => Object.keys(colors.dark) };
