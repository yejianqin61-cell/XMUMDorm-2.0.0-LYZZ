/**
 * Pressable（A12）—— **唯一可点原语**（组件定义 §2.1 原子层硬规则③）
 *
 * 存在的理由：宪法 **7.1** 要求 iOS ≥44×44pt / Android ≥48×48dp，而**四类元素最容易违规** ——
 * `C02 IconButton` · `A09 Chip` 的删除叉 · `A08 Badge`（若可点）· 列表行尾部动作。
 * 把这四类都收口到本组件后，"命中区不足"就变成**类型/默认值问题**，而不是靠人记得。
 *
 * 三条纪律：
 *   - **视觉尺寸可以更小，命中区不得更小**：外层容器撑到 `theme.touchTarget`，
 *     视觉由 children 决定（⛔ 不靠放大图标来凑命中区）；
 *   - **按压反馈**：`opacity`（默认）/ `scale` / `none`；
 *     ⛔ **`reduceMotion` 时一律降级为 `none`**（宪法 7.3：每条动效都必须声明降级）；
 *   - ⛔ 不设底色（`Surface` 的事）—— 需要底色的可点元素由调用方包一层 Surface。
 */

import * as React from 'react';
import {
  Pressable as RNPressable,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/design-system/theme';

export type PressableFeedback = 'opacity' | 'scale' | 'none';

/**
 * 反馈降级（宪法 7.3）：系统开启"减弱动态效果"时，**位移类**反馈必须消失。
 * 抽成纯函数是为了**可测** —— 否则只能靠 mock `AccessibilityInfo` + 等 effect，测不稳。
 */
export function resolveFeedback(
  feedback: PressableFeedback,
  reduceMotion: boolean
): PressableFeedback {
  return reduceMotion && feedback === 'scale' ? 'none' : feedback;
}

export type PressableProps = {
  onPress?: () => void;
  /** 长按（列表行"更多"等） */
  onLongPress?: () => void;
  disabled?: boolean;
  feedback?: PressableFeedback;
  /** 读屏标签；⛔ 纯图标 / 纯色块可点元素**必须**给 */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** ⛔ 用 RN 的完整角色联合，而不是自定义子集 —— 免得控件层因为缺一个角色就去改原子 */
  accessibilityRole?: AccessibilityRole;
  /** 是否被选中（`tab` / `radio` / `checkbox` 角色用） */
  selected?: boolean;
  /** 额外的无障碍状态（`checked` / `expanded` / `busy` / `checkedState` …）。
   * 本组件只负责合并 `disabled` / `selected`，⛔ 不解释语义 —— 语义由调用方负责。 */
  accessibilityState?: AccessibilityState;
  /** Android 的实时播报级别（Toast / 行内提示这类"内容会变"的元素要用） */
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  /** Android 的子树隐藏（与 `accessibilityElementsHidden` 配对使用才两端都生效） */
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
  /** iOS 的子树隐藏（与 `importantForAccessibility` 配对） */
  accessibilityElementsHidden?: boolean;
  /** 额外扩大命中区（在 `touchTarget` 下限之外的补充） */
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
};

export function Pressable({
  onPress,
  onLongPress,
  disabled = false,
  feedback = 'opacity',
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  selected,
  accessibilityState,
  accessibilityLiveRegion,
  importantForAccessibility,
  accessibilityElementsHidden,
  hitSlop,
  style,
  children,
  testID,
}: PressableProps): React.ReactElement {
  const theme = useTheme();

  // 7.3：系统开启"减弱动态效果"时，缩放反馈必须消失（透明度反馈可以保留：它不是位移）
  const effectiveFeedback = resolveFeedback(feedback, theme.reduceMotion);

  const box: StyleProp<ViewStyle> = [
    {
      // 命中区下限（⛔ 不可用"放大图标"来满足这条）
      minWidth: theme.touchTarget,
      minHeight: theme.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
    },
    style,
  ];

  /**
   * 合并无障碍状态。
   * ⚠️ **不能写成 `{...accessibilityState, disabled, selected}`**：`selected` 默认是
   *    `undefined`，那样会把调用方通过 `accessibilityState` 传进来的 `selected`
   *    **静默抹掉**（P1-05 实现期实测到的真 bug）。只有显式传了才覆盖。
   */
  const mergedState: AccessibilityState = { ...accessibilityState, disabled };
  if (selected !== undefined) mergedState.selected = selected;

  return (
    <RNPressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole === 'none' ? undefined : accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={mergedState}
      accessibilityLiveRegion={accessibilityLiveRegion}
      importantForAccessibility={importantForAccessibility}
      accessibilityElementsHidden={accessibilityElementsHidden}
      hitSlop={hitSlop ?? theme.space('space_2')}
      style={({ pressed }) => [
        box,
        pressed && effectiveFeedback === 'opacity' ? { opacity: 0.6 } : null,
        pressed && effectiveFeedback === 'scale' ? { transform: [{ scale: 0.97 }] } : null,
        pressed && effectiveFeedback === 'none' && !disabled ? { opacity: 1 } : null,
      ]}
    >
      {children}
    </RNPressable>
  );
}
