/**
 * CountdownButton（`D25`）—— 验证码的"60 秒后重发"（组件定义 §2.6）
 *
 * 用它的页：`A-03` 注册（`send-verification-code`）· `A-04` 找回密码（`send-reset-code`）—— **两页各一处**。
 *
 * ## 三条纪律
 *   1. **冷却时长是服务端的镜像**：后端对 (email, scene) 有 **60s** 冷却（`routes/auth.js:68-82`），
 *      前端倒计时**只为了让用户少撞一次 429**，服务端才是权威。
 *   2. **组件内 0 文案**：按钮文案与倒计时模板都由页面给词条。
 *   3. 冷却中**禁用**并显示剩余秒数（⛔ 不是"点了没反应"）。
 */

import * as React from 'react';

import { Button } from './Button';

/** 服务端冷却（秒）——改一处要两处一起改 */
export const CODE_COOLDOWN_SECONDS = 60;

export type CountdownState = 'ready' | 'counting' | 'busy';

/** 纯规则：现在该显示什么（可测） */
export function resolveCountdownState(input: {
  remainingSeconds: number;
  loading: boolean;
  disabled: boolean;
}): CountdownState {
  if (input.loading) return 'busy';
  if (input.remainingSeconds > 0) return 'counting';
  return 'ready';
}

export type CountdownButtonProps = {
  /** 可点时的按钮文案（词条由页面给） */
  label: string;
  /** 倒计时文案模板（页面给，例如 `(n) => t('auth.resendIn', { n })`） */
  formatCountdown: (seconds: number) => string;
  onPress: () => void | Promise<void>;
  /** 冷却秒数（默认 60，与服务端一致） */
  seconds?: number;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  testID?: string;
};

export function CountdownButton({
  label,
  formatCountdown,
  onPress,
  seconds = CODE_COOLDOWN_SECONDS,
  disabled = false,
  size = 'small',
  testID,
}: CountdownButtonProps): React.ReactElement {
  const [remaining, setRemaining] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const state = resolveCountdownState({ remainingSeconds: remaining, loading, disabled });

  const press = React.useCallback(async () => {
    if (state !== 'ready') return;
    setLoading(true);
    try {
      await onPress();
    } finally {
      setLoading(false);
      // 无论成功与否都开始倒计时：失败多半是冷却中/限流，立刻再点只会再撞一次
      setRemaining(seconds);
    }
  }, [onPress, seconds, state]);

  return (
    <Button
      testID={testID}
      label={state === 'counting' ? formatCountdown(remaining) : label}
      variant="secondary"
      size={size}
      loading={state === 'busy'}
      disabled={state !== 'ready'}
      onPress={() => void press()}
    />
  );
}
