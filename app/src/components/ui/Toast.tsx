/**
 * Toast（O01）—— 操作回执（组件定义 §2.5；侵入度"极低"）
 *
 * 用法（两处接线）：
 *   1. 根布局挂一次 `<ToastProvider>` + `<ToastHost bottomInset={…} />`
 *   2. 页面里 `const toast = useToast(); toast.show({ message: t('…'), tone: 'success' })`
 *
 * 三条纪律：
 *   - **2–4s，自动消失**：时长由 `clampToastDuration` 夹紧（⛔ 不接受"永久提示"）；
 *   - ⛔ **不得承载需要阅读的说明**（10.5）——需要读的东西用 `O02 InlineNotice`
 *     或就地文案，Toast 只用于"刚刚那件事成了/没成"；
 *   - **`bottomInset` 由根布局注入**（宪法 17.1-S2）：本文件**不调用** `useSafeAreaInsets()`，
 *     否则就成了第 3 个安全区调用点，"唯一容器"名存实亡。
 *
 * ⚠️ **滑走（swipe-to-dismiss）未实现**：那需要 `gesture-handler` 的手势接线，
 *    本版提供**点击关闭 + 自动消失**。已登记为遗留（见 P1-07 §6）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { DarkColorTokenName } from '@/design-system/tokens';
import { Pressable } from './Pressable';
import { Text } from './Text';

export const TOAST_DURATION_MIN_MS = 2000;
export const TOAST_DURATION_MAX_MS = 4000;
export const TOAST_DURATION_DEFAULT_MS = 3000;

/** 时长夹紧到 2–4s（纯函数；⛔ 不给"永不消失"留口子） */
export function clampToastDuration(ms?: number): number {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return TOAST_DURATION_DEFAULT_MS;
  if (ms < TOAST_DURATION_MIN_MS) return TOAST_DURATION_MIN_MS;
  if (ms > TOAST_DURATION_MAX_MS) return TOAST_DURATION_MAX_MS;
  return ms;
}

export type ToastTone = 'success' | 'danger' | 'info';

export type ToastRequest = {
  message: string;
  tone?: ToastTone;
  /** 可选撤销/重做动作（如"撤销"） */
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

/**
 * ⚠️ **两个 context 是刻意的**：
 *   - 展示层要读 `current`，所以它一变就得重渲染；
 *   - **页面拿到的 `show`/`dismiss` 必须身份稳定**，否则 `useEffect(…, [toast])` 会**无限循环**
 *     （P1-07 实现期就是被这个坑掉的：测试里 `useEffect(…, [toast])` 直接跑出 OOM）。
 *     把"会变的状态"和"稳定的动作"分开，页面就能安全地把它放进依赖数组。
 */
type ToastStateValue = { current: ActiveToast | null; dismiss: () => void };
type ToastActionsValue = { show: (request: ToastRequest) => void; dismiss: () => void };

const ToastStateContext = React.createContext<ToastStateValue | null>(null);
const ToastActionsContext = React.createContext<ToastActionsValue | null>(null);

/**
 * ⚠️ **Provider 不渲染展示层**：insets 只能在 `SafeAreaProvider` 内部取到，
 *    因此展示交给根布局里的 `<ToastHost bottomInset={…} />`（见 P1-07 §3-4）。
 */
export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [current, setCurrent] = React.useState<ActiveToast | null>(null);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback(() => setCurrent(null), []);

  const show = React.useCallback((request: ToastRequest) => {
    nextId.current += 1;
    setCurrent({ ...request, id: nextId.current });
  }, []);

  // 动作对象的身份**只依赖稳定的回调** → 页面的 effect 不会因为"来了个 Toast"而重跑
  const actions = React.useMemo(() => ({ show, dismiss }), [show, dismiss]);
  const state = React.useMemo(() => ({ current, dismiss }), [current, dismiss]);

  // 自动消失：时长夹紧在 2–4s
  React.useEffect(() => {
    if (current === null) return;
    const timer = setTimeout(dismiss, clampToastDuration(current.durationMs));
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastStateContext.Provider value={state}>{children}</ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
}

/** 页面侧取用；⛔ 没有 Provider 就抛（早失败优于静默丢弃回执） */
export function useToast(): ToastActionsValue {
  const value = React.useContext(ToastActionsContext);
  if (value === null) {
    throw new Error('useToast 必须在 ToastProvider 内使用：回执不能静默丢弃');
  }
  return value;
}

const TONE_FILL: Record<ToastTone, DarkColorTokenName> = {
  success: 'state-success',
  danger: 'state-danger',
  info: 'bg-raised',
};

const TONE_TEXT: Record<ToastTone, DarkColorTokenName> = {
  success: 'text-on-state',
  danger: 'text-on-state',
  info: 'text-primary',
};

export type ActiveToast = Required<Pick<ToastRequest, 'message'>> &
  ToastRequest & { id: number };

export type ToastHostProps = {
  toast?: ActiveToast | null;
  onDismiss?: () => void;
  /** 由根布局注入的底部安全区（S2：本文件不读 insets） */
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * 展示层。从 `ToastProvider` 的 context 取当前 Toast；也接受**受控**用法
 * （直接给 `toast`）以便测试与特殊场景。
 */
export function ToastHost({
  bottomInset = 0,
  style,
  testID,
  toast,
  onDismiss,
}: ToastHostProps): React.ReactElement | null {
  const theme = useTheme();
  const context = React.useContext(ToastStateContext);
  const active = toast !== undefined ? toast : (context?.current ?? null);
  const dismiss = onDismiss ?? context?.dismiss;

  if (active === null) return null;
  const tone = active.tone ?? 'info';

  return (
    <View
      testID={testID}
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: theme.space('space_4'),
          right: theme.space('space_4'),
          bottom: bottomInset + theme.space('space_4'),
        },
        style,
      ]}
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        // 读屏在 Toast 出现时应主动播报（Android: liveRegion / iOS: alert 角色）
        accessibilityLiveRegion="polite"
        accessibilityLabel={active.message}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space('space_3'),
          paddingHorizontal: theme.space('space_3'),
          paddingVertical: theme.space('space_2'),
          backgroundColor: theme.color[TONE_FILL[tone]].value,
          borderRadius: theme.radius('radius_medium'),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text role="body" colorToken={TONE_TEXT[tone]} numberOfLines={2}>
            {active.message}
          </Text>
        </View>
        {active.actionLabel ? (
          <Pressable onPress={active.onAction} accessibilityLabel={active.actionLabel}>
            <Text role="label" emphasis="strong" colorToken={TONE_TEXT[tone]}>
              {active.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}
