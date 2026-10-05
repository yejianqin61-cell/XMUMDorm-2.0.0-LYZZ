/**
 * FormField（K03）—— 单字段外壳（组件定义 §2.3 / §3.2.1 / §3.2.2）
 *
 * ## ⚠️ 一处**文档与文档冲突**的处置（如实记录）
 * - **§3.2.1** 把 `FormField` 的解剖写成"标签（≤6 汉字）+ 必填标记 + 控件 + 字段级错误（就近）"；
 * - **§3.3.2** 又把同一套东西写进 `C04 Input` / `C05 TextArea` 的解剖里。
 *
 * 两者**只可能有一处渲染**，否则同一个标签会出现两遍。本包的选择是：
 * **标签 / 必填 / 就近错误由控件渲染**（`C04`/`C05` 等本来就 own 它们，而且它们也能**单独使用**），
 * `K03` 的职责是**把字段描述符映射到正确的控件**，并补上控件没有的两件事：
 *   1. **帮助文案**（`helpKey` 渲染出来的那一行）；
 *   2. **字段注册**（把控件挂进 `K01` 的 ref 注册表 → `K04` 才能"把焦点移过去"）。
 *
 * 为什么不做成"K03 渲染标签、控件渲染裸输入"：那要给 8 个控件各加一个 bare 模式，
 * 换来的只是把同一份标签换个地方画 —— 属于 §9.14-① 说的"同语义多层"。
 */

import * as React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design-system/theme';
import type { MessageKey } from '@/i18n/zh';
import { useI18n } from '@/i18n';
import { Checkbox } from './Checkbox';
import { Input, type InputKind } from './Input';
import { MultiSelect } from './MultiSelect';
import { SegmentedControl } from './SegmentedControl';
import { Select } from './Select';
import { Switch } from './Switch';
import { TagPicker } from './TagPicker';
import { Text } from './Text';
import { TextArea } from './TextArea';

/* ────────────────────────── 字段描述符（唯一的表单配置方言，§3.2.2） ────────────────────────── */

export type FormOption = { value: string; label: string };

/** 选项来源：枚举**必须**来自 `shared/constants/*`（宪法 9.6），⛔ 不得在 App 内复制枚举 */
export type OptionSource =
  | { kind: 'constants'; options: readonly FormOption[] }
  | { kind: 'static'; options: readonly FormOption[] }
  | {
      kind: 'remote';
      options: readonly FormOption[];
      loading?: boolean;
      errorKey?: MessageKey;
    };

export type FormFieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'password'
  | 'number'
  | 'segmented'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'switch'
  | 'tags'
  | 'custom';

export type FormFieldDescriptor = {
  kind: FormFieldKind;
  name: string;
  /** 标签（≤6 汉字，§3.6） */
  labelKey: MessageKey;
  placeholderKey?: MessageKey;
  /** 帮助文案（`K03` 补的那一行） */
  helpKey?: MessageKey;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  /** 选项（`segmented`/`select`/`multiselect`/`tags` 用） */
  source?: OptionSource;
  max?: number;
  /** `tags` 的枚举白名单（给了就是 `enum` 形态） */
  enumTags?: readonly string[];
  /** `custom` 的渲染函数 */
  render?: (api: { value: unknown; onChange: (next: unknown) => void; disabled: boolean }) => React.ReactNode;
  /**
   * ⛔ **不落草稿**：密码类字段（以及任何"值本身就是凭据"的字段）必须置位。
   * 依据宪法 4.1.2-2（凭据不得进 AsyncStorage）。`kind === 'password'` 会自动置为真。
   */
  neverDraft?: boolean;
  /** 条件可见 / 禁用（§3.2.2 公共字段） */
  visibleWhen?: (values: FormValues) => boolean;
  disabledWhen?: (values: FormValues) => boolean;
  /** 校验：返回**词条 key**（⛔ 不返回拼接好的句子） */
  validate?: (value: unknown, values: FormValues) => MessageKey | undefined;
};

export type FormValues = Record<string, unknown>;

/* ────────────────────────── 纯函数（可测） ────────────────────────── */

/** 描述符 → 实际控件（纯函数，便于断言"哪种 kind 落到哪个控件"） */
export type ControlKind = 'input' | 'textarea' | 'segmented' | 'select' | 'multiselect' | 'checkbox' | 'switch' | 'tags' | 'custom';

export function controlKindFor(kind: FormFieldKind): ControlKind {
  switch (kind) {
    case 'textarea':
      return 'textarea';
    case 'segmented':
      return 'segmented';
    case 'select':
      return 'select';
    case 'multiselect':
      return 'multiselect';
    case 'checkbox':
      return 'checkbox';
    case 'switch':
      return 'switch';
    case 'tags':
      return 'tags';
    case 'custom':
      return 'custom';
    default:
      // text / email / tel / password / number 都走 C04 Input（键盘类型不同）
      return 'input';
  }
}

/** `Input` 的 `kind`（纯函数；`textarea`/选择类不走这里） */
export function inputKindFor(kind: FormFieldKind): InputKind {
  switch (kind) {
    case 'email':
      return 'email';
    case 'tel':
      return 'tel';
    case 'password':
      return 'password';
    case 'number':
      return 'number';
    default:
      return 'text';
  }
}

export function createInitialValues(fields: readonly FormFieldDescriptor[]): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    values[field.name] =
      field.kind === 'checkbox'
        ? false
        : field.kind === 'switch'
          ? false
          : field.kind === 'multiselect' || field.kind === 'tags'
            ? []
            : field.kind === 'segmented' || field.kind === 'select'
              ? (field.source?.options[0]?.value ?? null)
              : '';
  }
  return values;
}

/** 该字段此刻是否可见（纯函数） */
export function isFieldVisible(field: FormFieldDescriptor, values: FormValues): boolean {
  return field.visibleWhen ? field.visibleWhen(values) : true;
}

/** 该字段此刻是否禁用（纯函数；`disabledWhen` 优先于别的） */
export function isFieldDisabled(field: FormFieldDescriptor, values: FormValues): boolean {
  return field.disabledWhen ? field.disabledWhen(values) : false;
}

/* ────────────────────────── 组件 ────────────────────────── */

export type FormFieldProps = {
  field: FormFieldDescriptor;
  value: unknown;
  values: FormValues;
  onChange: (name: string, next: unknown) => void;
  /** 字段级错误（**已渲染成文案**；词条渲染在 `K01`） */
  errorText?: string;
  /** 字段注册：`K01` 提供，`K04` 用它把焦点移过来 */
  onRegisterRef?: (name: string, ref: View | null) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function FormField({
  field,
  value,
  values,
  onChange,
  errorText,
  onRegisterRef,
  testID,
  style,
}: FormFieldProps): React.ReactElement | null {
  const theme = useTheme();
  const { t } = useI18n();
  const label = t(field.labelKey);
  const placeholder = field.placeholderKey ? t(field.placeholderKey) : undefined;
  const help = field.helpKey ? t(field.helpKey) : undefined;
  const disabled = isFieldDisabled(field, values);
  const set = (next: unknown): void => onChange(field.name, next);

  if (!isFieldVisible(field, values)) return null;

  const controlKind = controlKindFor(field.kind);
  const list = field.source?.options ?? [];

  let control: React.ReactNode = null;
  switch (controlKind) {
    case 'input':
      control = (
        <Input
          testID={testID}
          label={label}
          placeholder={placeholder}
          kind={inputKindFor(field.kind)}
          value={typeof value === 'string' ? value : ''}
          onChangeText={set}
          maxLength={field.maxLength}
          errorText={errorText}
          required={field.required}
          disabled={disabled}
        />
      );
      break;
    case 'textarea':
      control = (
        <TextArea
          testID={testID}
          label={label}
          placeholder={placeholder}
          value={typeof value === 'string' ? value : ''}
          onChangeText={set}
          maxLength={field.maxLength}
          counter={field.maxLength !== undefined}
          errorText={errorText}
          required={field.required}
          disabled={disabled}
        />
      );
      break;
    case 'segmented':
      control = (
        <SegmentedControl
          testID={testID}
          options={list}
          value={typeof value === 'string' ? value : ''}
          onChange={set}
          disabled={disabled}
        />
      );
      break;
    case 'select':
      control = (
        <Select
          testID={testID}
          label={label}
          options={list}
          value={typeof value === 'string' ? value : null}
          onChange={set}
          errorText={errorText}
          withSearch={list.length > 15}
          disabled={disabled}
        />
      );
      break;
    case 'multiselect':
      control = (
        <MultiSelect
          testID={testID}
          label={label}
          options={list}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={set}
          max={field.max}
          errorText={errorText}
          disabled={disabled}
        />
      );
      break;
    case 'checkbox':
      control = (
        <Checkbox
          testID={testID}
          label={label}
          state={value === true ? 'checked' : 'unchecked'}
          onPress={() => set(value !== true)}
          errorText={errorText}
          disabled={disabled}
        />
      );
      break;
    case 'switch':
      control = (
        <Switch
          testID={testID}
          label={label}
          value={value === true}
          onValueChange={set}
          disabled={disabled}
        />
      );
      break;
    case 'tags':
      control = (
        <TagPicker
          testID={testID}
          label={label}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={set}
          source={field.enumTags ? 'enum' : 'free'}
          options={field.enumTags}
          max={field.max}
          maxLength={field.maxLength}
          placeholder={placeholder}
          errorText={errorText}
          disabled={disabled}
        />
      );
      break;
    case 'custom':
      control = field.render?.({ value, onChange: set, disabled }) ?? null;
      break;
    default:
      control = null;
  }

  return (
    <View
      testID={testID ? `${testID}-field` : undefined}
      style={[{ gap: theme.space('space_1') }, style]}
      // 注册给 `K01`：`K04` 的"点条目 → 焦点移到该字段"靠它
      ref={(node) => onRegisterRef?.(field.name, node)}
    >
      {control}
      {help ? (
        <Text role="caption" colorToken="text-muted">
          {help}
        </Text>
      ) : null}
    </View>
  );
}
