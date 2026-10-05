/**
 * SchoolSystemCard（D27）—— 校方系统会话卡（组件定义 §2.6）
 *
 * 工具切片的**第一页就是它**（`T-04` 的交付物含"会话状态"）：没有它就没有地方
 * 呈现"未登录 / 已登录 / 已过期"，用户也不知道该不该重新登录。
 *
 * 三条硬要求（§7.3 对 `D27` 的原话）：
 *   1. **会话状态必须可播报**；
 *   2. **状态不得只靠色块** —— 所以是"图标 + 文案 + 颜色"三通道；
 *   3. 必须能**清除会话**（`logout`）。
 *
 * ⚠️ `T-05`（内嵌浏览器本体）属原型层 `P18`（§3.5）；本卡片只负责**入口与状态**，
 *    ⛔ 不在这里做 WebView（否则 `T-01` 与 `T-05` 会各揣一个 WebView 实现）。
 * ⛔ 组件内不写文案：系统名与"打开"文案由页面传（系统名走 `tools.system.*` 词条）。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import ShieldOff from 'lucide-react-native/icons/shield-off';

import { useTheme } from '@/design-system/theme';
import type { DarkColorTokenName } from '@/design-system/tokens';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n/zh';
import { Button } from './Button';
import { Card } from './Card';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

/** 会话三态（与 `T-05` 的读写共用同一套取值） */
export type SchoolSystemSessionState = 'signedOut' | 'signedIn' | 'expired';

export type SessionStateSpec = {
  state: SchoolSystemSessionState;
  labelKey: MessageKey;
  fill: DarkColorTokenName;
  onFill: DarkColorTokenName;
  icon: IconComponent;
};

/**
 * 三态 → 展示（**唯一的映射处**）。
 * ⛔ `expired` 不能与 `signedOut` 合并：前者需要用户"去重新登录"，后者只是"还没登录"，
 *    两者可改正的动作不同（§3.7 可改正）。
 */
export const SESSION_STATE_SPEC: Record<SchoolSystemSessionState, SessionStateSpec> = {
  signedOut: {
    state: 'signedOut',
    labelKey: 'tools.session.signedOut',
    fill: 'bg-sunken',
    onFill: 'text-secondary',
    icon: ShieldOff,
  },
  signedIn: {
    state: 'signedIn',
    labelKey: 'tools.session.signedIn',
    fill: 'bg-success-soft',
    onFill: 'text-success',
    icon: ShieldCheck,
  },
  expired: {
    state: 'expired',
    labelKey: 'tools.session.expired',
    fill: 'bg-warning-soft',
    onFill: 'text-warning',
    icon: ShieldOff,
  },
};

export type SchoolSystemCardProps = {
  /** 系统名（页面用词条传入，如"教务 AC"） */
  title: string;
  /** 可选的系统域名说明（⛔ 只写域名，不写 IP —— 与 `schoolSystems.ts` 同规） */
  origin?: string;
  state: SchoolSystemSessionState;
  /** 打开系统（进 `T-05` 内嵌浏览器或站外） */
  openLabel: string;
  onOpen: () => void;
  /** 已登录/已过期才需要清除会话 */
  onClearSession?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function SchoolSystemCard({
  title,
  origin,
  state,
  openLabel,
  onOpen,
  onClearSession,
  disabled = false,
  style,
  testID,
}: SchoolSystemCardProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const spec = SESSION_STATE_SPEC[state];
  const stateLabel = t(spec.labelKey);
  const canClear = state !== 'signedOut' && onClearSession !== undefined;

  return (
    <Card testID={testID} variant="outlined" style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
        <View style={{ flex: 1, gap: theme.space('space_1') }}>
          <Text role="label" emphasis="strong" colorToken="text-primary" numberOfLines={1}>
            {title}
          </Text>
          {origin ? (
            <Text role="caption" colorToken="text-muted" numberOfLines={1}>
              {origin}
            </Text>
          ) : null}
        </View>

        {/* 状态：图标 + 文案 + 底色（三通道；⛔ 不只靠色块），并**可播报** */}
        <View
          accessibilityRole="text"
          accessibilityLabel={`${title}：${stateLabel}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space('space_1'),
            paddingHorizontal: theme.space('space_2'),
            paddingVertical: theme.space('space_1'),
            borderRadius: theme.radius('radius_full'),
            backgroundColor: theme.color[spec.fill].value,
          }}
        >
          <Icon source={spec.icon} size="inline" tint={state === 'signedIn' ? 'success' : state === 'expired' ? 'warning' : 'secondary'} />
          <Text role="caption" colorToken={spec.onFill}>
            {stateLabel}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
        <Button label={openLabel} variant="primary" onPress={onOpen} disabled={disabled} />
        {canClear ? (
          <Button
            testID={testID ? `${testID}-clear` : undefined}
            label={t('tools.session.clear')}
            variant="ghost"
            onPress={onClearSession}
            disabled={disabled}
          />
        ) : null}
      </View>
    </Card>
  );
}
