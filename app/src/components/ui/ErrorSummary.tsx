/**
 * ErrorSummary（K04）—— 提交失败时置顶的错误摘要（组件定义 §2.3 / §3.7）
 *
 * ⛔ **它与 `T02 ErrorState` 是错误文案三要素的两个唯一实现处**（§3.7）：
 *    表单级错误必须走 `toErrorCopy`（可感知/可理解/可改正），页面**不得自写**。
 *
 * 三条硬要求：
 *   1. **置顶**（不只在字段旁）—— 否则用户不知道"一共错了几处"；
 *   2. **字段错误可点** → 把焦点移到那个字段（§3.2.3 状态机的 `error` 行）；
 *   3. **一个错误只给一个主行动**（§3.7）。
 *
 * ⚠️ 焦点移动在 RN 里**没有**跨平台的"聚焦任意 View"API；标准做法是
 *    `AccessibilityInfo.setAccessibilityFocus(reactTag)`（TalkBack/VoiceOver 会读它）。
 *    所以这里把"取 reactTag"抽成 `focusRef`，让 `K01` 用一个 ref 注册表统一提供。
 */

import * as React from 'react';
import { AccessibilityInfo, Platform, View, findNodeHandle, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import { toErrorCopy, type AppError } from '@/i18n/errors';
import { useI18n } from '@/i18n';
import { Button } from './Button';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Surface } from './Surface';
import { Text } from './Text';
import CircleAlert from 'lucide-react-native/icons/circle-alert';

export type FieldErrorEntry = {
  /** 字段名（与 DSL 的 `name` 一致） */
  name: string;
  /** 字段标签（给人看的） */
  label: string;
  /** 错误文案（来自 DSL 的 `validate` 返回值经词条渲染） */
  message: string;
};

/**
 * 把焦点移到某个无障碍元素（⛔ 不是"让输入框可编辑"——那是另一回事）。
 * 单独导出是为了**可测**：用例 mock `AccessibilityInfo` 就能断言"确实移了焦点"。
 */
export function focusAccessibilityElement(ref: unknown): void {
  const tag = ref as number | null | undefined;
  if (typeof tag !== 'number') return;
  AccessibilityInfo.setAccessibilityFocus(tag);
}

/** Browser refs are DOM elements; RN Web deliberately rejects findNodeHandle. */
export function focusAccessibilityRef(ref: unknown): void {
  if (Platform.OS === 'web') {
    const node = ref as { focus?: () => void; setAttribute?: (name: string, value: string) => void } | null;
    if (typeof node?.focus === 'function') {
      node.setAttribute?.('tabindex', '-1');
      node.focus();
    }
    return;
  }
  if (ref != null) focusAccessibilityElement(findNodeHandle(ref as View));
}

export type ErrorSummaryProps = {
  /** 字段级错误（已在字段旁显示过，这里再置顶一次以给出"一共几处"） */
  fieldErrors?: readonly FieldErrorEntry[];
  /** 表单级错误（无法映射到字段的，如"两次提交冲突"） */
  formError?: AppError | null;
  /** 点字段条目 → 把焦点移过去 */
  onPressField?: (name: string) => void;
  /** 表单级错误的主行动（§3.7：一个错误只给一个主行动） */
  onRetry?: () => void;
  /** 标题（≤12 汉字，页面传词条） */
  title: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ErrorSummary({
  fieldErrors = [],
  formError = null,
  onPressField,
  onRetry,
  title,
  style,
  testID,
}: ErrorSummaryProps): React.ReactElement | null {
  const theme = useTheme();
  const { t } = useI18n();
  const summaryRef = React.useRef<View>(null);

  const hasFieldErrors = fieldErrors.length > 0;
  const copy = formError ? toErrorCopy(formError, t) : null;

  /**
   * 出现即把焦点移过来（§3.2.3：`error` 状态必须"把焦点移过去"）。
   * ⚠️ 依赖里带上"有没有内容"：否则从"无错误"变成"有错误"时不会重新聚焦。
   */
  React.useEffect(() => {
    if (!hasFieldErrors && copy === null) return;
    const node = summaryRef.current;
    if (node === null) return;
    // `findNodeHandle` 是 RN 里把 ref 变成读屏可聚焦 tag 的标准做法；
    // 拿不到就静默跳过（⛔ 不在渲染路径上抛）
    focusAccessibilityRef(node);
  }, [hasFieldErrors, copy]);

  if (!hasFieldErrors && copy === null) return null;

  return (
    <Surface
      testID={testID}
      rounded="radius_medium"
      bordered="strong"
      padding="space_3"
      style={style}
    >
      <View ref={summaryRef} accessible accessibilityRole="alert" style={{ gap: theme.space('space_2') }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
          {/* 错误双通道：图标 + 文案（⛔ 不得只靠颜色） */}
          <Icon source={CircleAlert} size="body" tint="danger" />
          <Text role="label" emphasis="strong" colorToken="text-danger">
            {title}
          </Text>
        </View>

        {/* 字段错误：可点 → 焦点移到该字段 */}
        {fieldErrors.map((entry) => (
          <Pressable
            key={entry.name}
            testID={testID ? `${testID}-${entry.name}` : undefined}
            onPress={onPressField ? () => onPressField(entry.name) : undefined}
            disabled={onPressField === undefined}
            accessibilityRole="button"
            accessibilityLabel={`${entry.label}：${entry.message}`}
            style={{ minHeight: theme.touchTarget, justifyContent: 'center' }}
          >
            <Text role="caption" colorToken="text-danger">
              {`${entry.label}：${entry.message}`}
            </Text>
          </Pressable>
        ))}

        {/* 表单级错误：三段文案（可感知/可理解/可改正），主行动只有一个 */}
        {copy ? (
          <View style={{ gap: theme.space('space_1') }}>
            <Text role="body" colorToken="text-primary">
              {copy.perceive}
            </Text>
            {copy.objectLabel ? (
              <Text role="caption" colorToken="text-secondary">
                {copy.objectLabel}
              </Text>
            ) : null}
            <Text role="caption" colorToken="text-secondary">
              {copy.understand}
            </Text>
            {onRetry ? (
              <Button label={copy.fix} variant="secondary" size="small" onPress={onRetry} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Surface>
  );
}
