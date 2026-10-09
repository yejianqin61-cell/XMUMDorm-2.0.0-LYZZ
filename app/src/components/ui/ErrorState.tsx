/**
 * ErrorState（T02）—— 错误态：**错误文案三要素的唯一实现处之一**（组件定义 §2.4 / §3.7）
 *
 * ⛔ **页面不得自写错误文案**（§3.2.5-②）：三段文案全部来自 `i18n/errors.ts` 的
 *    `toErrorCopy(error, t)` —— 它保证「可感知 / 可理解 / 可改正」三要素齐全，
 *    且**网络类区分无网络 / 服务不可达 / 超时**三种（用户能做的事不同）。
 *
 * ⛔ 结构上就**不可能泄露技术细节**：本组件只渲染 `ErrorCopy` 的三段文案，
 *    拿不到、也不接收 HTTP 状态码 / 堆栈 / 内部错误码。
 *
 * ⛔ **一个错误只给一个主行动**：按钮文案就是 `copy.fix`（动词开头），
 *    ⛔ 不再额外给第二个按钮。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import Clock from 'lucide-react-native/icons/clock';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Lock from 'lucide-react-native/icons/lock';
import FileX from 'lucide-react-native/icons/file-x';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';

import { useTheme } from '@/design-system/theme';
import { toErrorCopy, type AppError, type AppErrorKind } from '@/i18n/errors';
import { useI18n } from '@/i18n';
import { Button } from './Button';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

/** 错误种类 → 图标（第 1 层）。⛔ 每一类都要有自己的图标，不能全用同一个感叹号 */
export const ERROR_ICON: Record<AppErrorKind, IconComponent> = {
  offline: WifiOff,
  unreachable: CloudOff,
  timeout: Clock,
  validation: CircleAlert,
  permission: Lock,
  terms: Lock,
  content: FileX,
  conflict: RefreshCw,
  unknown: CircleAlert,
};

export type ErrorStateProps = {
  error: AppError;
  /** 主行动：动作类型由 `toErrorCopy` 给出（`retry` / `edit` / `refresh` …） */
  onAction: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ErrorState({
  error,
  onAction,
  style,
  testID,
}: ErrorStateProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const copy = toErrorCopy(error, t);

  return (
    <View
      testID={testID}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space('space_3'),
          padding: theme.space('space_6'),
        },
        style,
      ]}
    >
      {/* 错误双通道：图标 + 文案（⛔ 不得只靠颜色，宪法 2.1.1） */}
      <Icon source={ERROR_ICON[error.kind] ?? CircleAlert} size="hero" tint="danger" />
      <Text role="headline" emphasis="strong" colorToken="text-primary" align="center">
        {copy.perceive}
      </Text>
      {/* 「可感知」：指明**具体对象**（哪个字段/哪条内容/哪个操作）。
          独立成行而不是拼进 perceive —— 中英语序不同，拼接会把语序写死在代码里。 */}
      {copy.objectLabel ? (
        <Text role="label" colorToken="text-secondary" align="center">
          {copy.objectLabel}
        </Text>
      ) : null}
      <Text role="body" colorToken="text-secondary" align="center">
        {copy.understand}
      </Text>
      <Button label={copy.fix} variant="primary" onPress={onAction} />
    </View>
  );
}
