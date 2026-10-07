/**
 * Form（K01）—— 参数化表单框架（组件定义 §2.3 / §3.2）
 *
 * 它是 `P4` 表单骨架：**字段描述符 DSL + 校验 + 提交语义 + 草稿 + 离开确认**。
 * 26 个表单页（含本包两个切片）都走它，⛔ **不允许任何页面手写表单**（§3.2.5-①）。
 *
 * ## 状态机（§3.2.3 `【已定】`）—— 唯一实现处
 * ```
 * idle ──edit──▶ dirty ──submit──▶ validating ──ok──▶ submitting ──▶ success
 *                   │                   │                   │
 *                   │                   └──fail──▶ error(fieldErrors)
 *                   └──leave──▶ DirtyGuard（O03 danger）
 * ```
 * 全部落在纯函数 `formReducer` 上，⛔ 不用"页面里各写一个 useState"。
 *
 * ## 四条 DSL 纪律（§3.2.2）里属于本文件的
 * - ⛔ **枚举必须来自 `shared/constants/*`** → `OptionSource.kind === 'constants'` 是唯一合法来源；
 * - 校验是**服务端的镜像**：客户端只为"少一次失败往返"，**服务端始终是权威**；
 *   → 所以 `submit:fail` 允许**按字段名回填**服务端错误（`applyServerFieldErrors`）；
 * - 同一字段的限额由**页面注入**（`maxLength` 在描述符里由页面写）；
 * - `asyncValidate` 只用于唯一性/权限类。
 *
 * ## 草稿与凭据（**这轮最要紧的一处**）
 * 宪法 4.4.3 要求"进程被杀后输入不丢"，而 §3.2.2-② 要求草稿落盘。
 * ⚠️ 但落盘层（`P1-02`）有**凭据护栏**：`draft:change-password` 这种 key 会因为
 *    切分后出现 `password` 段而被 `CredentialStorageError` **拒绝**。
 *    所以本文件做两件事：
 *    1. `draftableValues()` **剔除** `password` 类字段（⛔ 绝不把凭据写进 AsyncStorage）；
 *    2. 落盘前 `assertNotCredential` 预检，**不通过就干脆不落草稿**（⛔ 不崩，也不静默写）。
 */

import * as React from 'react';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import {
  ScrollView,
  View,
  findNodeHandle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/design-system/theme';
import { toErrorCopy, type AppError } from '@/i18n/errors';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n/zh';
import { assertNotCredential, getItem, removeItem, setItem } from '@/shared/storage';
import { AlertDialog } from './AlertDialog';
import { Button } from './Button';
import { ErrorSummary, focusAccessibilityElement, type FieldErrorEntry } from './ErrorSummary';
import {
  FormField,
  createInitialValues,
  isFieldVisible,
  type FormFieldDescriptor,
  type FormValues,
} from './FormField';
import { FormSection } from './FormSection';
import { Screen, type ScreenProps } from './Screen';

/* ────────────────────────── 状态机（纯函数） ────────────────────────── */

export type FormStatus = 'idle' | 'dirty' | 'validating' | 'submitting' | 'success' | 'error';

export type FormState = {
  status: FormStatus;
  /** 字段名 → 词条 key（**存 key 不存文案**：语言切换后要能跟着变） */
  fieldErrorKeys: Readonly<Record<string, MessageKey>>;
  /** 无法映射到字段的表单级错误（进 `K04` 摘要） */
  formError: AppError | null;
};

export const INITIAL_FORM_STATE: FormState = {
  status: 'idle',
  fieldErrorKeys: {},
  formError: null,
};

export type FormAction =
  | { type: 'edit'; field?: string }
  | { type: 'validate:start' }
  | { type: 'validate:fail'; fieldErrorKeys: Record<string, MessageKey> }
  | { type: 'submit:start' }
  | { type: 'submit:success' }
  | { type: 'submit:fail'; fieldErrorKeys?: Record<string, MessageKey>; formError?: AppError }
  | { type: 'reset' }
  | { type: 'restoreDraft' };

/**
 * 表单状态机（纯函数）。三条不变量：
 * - **`submitting` 期间不得再提交**（防重复提交，§3.2.5）；
 * - `edit` 只把状态推到 `dirty`，**不动 `submitting`/`success`**（提交中改内容不应打断提交）；
 * - `success` 之后 `edit` 回到 `dirty`（继续编辑就是新一轮）。
 */
export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'edit':
      if (state.status === 'submitting') return state;
      return { ...state, status: 'dirty' };
    case 'validate:start':
      if (state.status === 'submitting') return state;
      return { ...state, status: 'validating', formError: null };
    case 'validate:fail':
      return { ...state, status: 'error', fieldErrorKeys: action.fieldErrorKeys, formError: null };
    case 'submit:start':
      if (state.status === 'submitting') return state;
      return { ...state, status: 'submitting', fieldErrorKeys: {}, formError: null };
    case 'submit:success':
      return { ...INITIAL_FORM_STATE, status: 'success' };
    case 'submit:fail':
      return {
        ...state,
        status: 'error',
        fieldErrorKeys: action.fieldErrorKeys ?? {},
        formError: action.formError ?? null,
      };
    case 'reset':
      return INITIAL_FORM_STATE;
    case 'restoreDraft':
      // 有草稿 = 有未保存内容（否则"离开确认"会漏掉"刚打开就退出"这一路）
      return { ...state, status: 'dirty' };
    default:
      return state;
  }
}

/** 提交语义 → 成功后该做什么（§3.2.4 三种，页面必须显式声明） */
export type SubmitSemantic = 'create' | 'update' | 'action';

export type PostSubmitPlan = {
  /** `create` 去详情页（replace）；`update` 返回；`action` 原地不动 */
  navigate: 'replace' | 'back' | 'stay';
  /** 是否要失效相关列表 query */
  invalidateLists: boolean;
  /** ⛔ 成功**不得**弹对话框（宪法 10.4）—— 这条写进类型，页面拿不到"弹窗"这个选项 */
  announce: 'toast' | 'none';
};

export function postSubmitPlan(semantic: SubmitSemantic): PostSubmitPlan {
  switch (semantic) {
    case 'create':
      return { navigate: 'replace', invalidateLists: true, announce: 'toast' };
    case 'update':
      return { navigate: 'back', invalidateLists: true, announce: 'toast' };
    case 'action':
      return { navigate: 'stay', invalidateLists: false, announce: 'toast' };
  }
}

/** 有没有未保存内容（纯函数）：`submitting` 期间不算（正在保存），`success` 之后不算 */
export function hasUnsavedChanges(state: FormState): boolean {
  return state.status === 'dirty' || state.status === 'validating' || state.status === 'error';
}

/* ────────────────────────── DSL：校验 ────────────────────────── */

/**
 * 校验全部字段（纯函数）→ 字段名 → 词条 key。
 * ⛔ 客户端校验**只是服务端的镜像**：这里通过 ≠ 服务端认可（§3.2.2-②）。
 */
export function validateAll(
  fields: readonly FormFieldDescriptor[],
  values: FormValues
): Record<string, MessageKey> {
  const errors: Record<string, MessageKey> = {};
  for (const field of fields) {
    if (!isFieldVisible(field, values)) continue;
    const value = values[field.name];
    if (field.required && isEmptyValue(value)) {
      errors[field.name] = 'form.error.required';
      continue;
    }
    if (field.maxLength !== undefined && typeof value === 'string' && value.length > field.maxLength) {
      errors[field.name] = 'form.error.tooLong';
      continue;
    }
    const custom = field.validate?.(value, values);
    if (custom !== undefined) errors[field.name] = custom;
  }
  return errors;
}

/** 空值的判定（纯函数）：`''` / `null` / `undefined` / 空数组都算空；⛔ `0` 与 `false` **不算空** */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * 服务端返回的字段错误 → 本地字段错误（§3.2.2-②：**必须按字段名回填**，无法映射的进摘要）。
 * 返回 `{ fieldErrorKeys, formError }`：映射不上的**不丢**，交给 `K04` 置顶。
 */
export function applyServerFieldErrors(
  serverErrors: readonly { field: string; messageKey: MessageKey }[],
  knownFieldNames: readonly string[]
): { fieldErrorKeys: Record<string, MessageKey>; unmapped: readonly { field: string; messageKey: MessageKey }[] } {
  const known = new Set(knownFieldNames);
  const fieldErrorKeys: Record<string, MessageKey> = {};
  const unmapped: { field: string; messageKey: MessageKey }[] = [];
  for (const entry of serverErrors) {
    if (known.has(entry.field)) fieldErrorKeys[entry.field] = entry.messageKey;
    else unmapped.push(entry);
  }
  return { fieldErrorKeys, unmapped };
}

/* ────────────────────────── 草稿（含凭据护栏） ────────────────────────── */

export function draftKeyFor(formId: string): string {
  return `draft:${formId}`;
}

/** 该字段的值能不能落草稿：密码类**一律不落**（宪法 4.1.2-2） */
export function isDraftable(field: FormFieldDescriptor): boolean {
  if (field.kind === 'password') return false;
  return field.neverDraft !== true;
}

/** 剔除不可落盘的字段（纯函数） */
export function draftableValues(
  fields: readonly FormFieldDescriptor[],
  values: FormValues
): FormValues {
  const out: FormValues = {};
  for (const field of fields) {
    if (!isDraftable(field)) continue;
    out[field.name] = values[field.name];
  }
  return out;
}

/** 这个表单 id 允许落草稿吗（护栏预检；⛔ 不通过就干脆不落，绝不崩） */
export function canPersistDraft(formId: string): boolean {
  try {
    assertNotCredential(draftKeyFor(formId));
    return true;
  } catch {
    return false;
  }
}

/* ────────────────────────── Hook ────────────────────────── */

export type UseFormOptions = {
  /** 表单 id：草稿 key 用它；⛔ 不要用形如 `…password…` 的 id（护栏会拒绝落盘） */
  formId: string;
  /** 调用方提供账号/学期分区；更换分区时须重挂表单，不能迁移旧 values。 */
  draftScope?: string;
  fields: readonly FormFieldDescriptor[];
  initialValues?: FormValues;
  /** 提交：⛔ 客户端校验通过后才调用；失败时抛/返回结构化错误 */
  onSubmit: (values: FormValues) => Promise<void>;
  onSubmitFieldErrors?: (errors: readonly { field: string; messageKey: MessageKey }[]) => void;
  /** 关掉草稿（默认开） */
  enableDraft?: boolean;
  /**
   * **跳过草稿恢复，但仍会保存**（P1-15 加）。
   *
   * ⚠️ 为什么需要它：`T-03` 的文本可能是**用户刚刚从别的页抓来的**（路由参数）。
   *    草稿恢复是**异步**的，会在挂载后把 `setValues` 再跑一遍 ——
   *    实测结果就是"刚抓来的长文本被昨天的旧草稿覆盖"，而且覆盖后连提交按钮都变灰
   *    （旧草稿太短）。这类"外部初始值 vs 本地草稿"的冲突只能由调用方表态，
   *    ⛔ 不能靠"谁先跑完"来定胜负。
   */
  skipDraftRestore?: boolean;
};

export type UseFormReturn = {
  values: FormValues;
  state: FormState;
  setValue: (name: string, next: unknown) => void;
  submit: () => Promise<void>;
  reset: () => void;
  /** 字段级错误**已渲染成文案**（语言/词条变化会跟着变） */
  fieldErrors: readonly FieldErrorEntry[];
  /** 供 `K04` 的 "点条目 → 焦点移到该字段" */
  registerFieldRef: (name: string, ref: View | null) => void;
  focusField: (name: string) => void;
  /** 是否要显示离开确认 */
  shouldConfirmLeave: boolean;
  /** 草稿：是否从草稿恢复过 */
  draftRestored: boolean;
  discardDraft: () => Promise<void>;
};

export function useForm(options: UseFormOptions): UseFormReturn {
  const { formId: baseId, draftScope, fields, initialValues, onSubmit, enableDraft = true, skipDraftRestore = false } = options;
  const formId = draftScope ? `${baseId}-${draftScope}` : baseId;
  const { t } = useI18n();

  const [values, setValues] = React.useState<FormValues>(
    () => initialValues ?? createInitialValues(fields)
  );
  const [state, dispatch] = React.useReducer(formReducer, INITIAL_FORM_STATE);
  const [draftRestored, setDraftRestored] = React.useState(false);
  const refs = React.useRef(new Map<string, View | null>());
  const submittingRef = React.useRef(false);

  const draftAllowed = enableDraft && canPersistDraft(formId);

  /* 草稿恢复：只在挂载时一次（`skipDraftRestore` 时**整段跳过**） */
  React.useEffect(() => {
    if (!draftAllowed || skipDraftRestore) return;
    let cancelled = false;
    void (async () => {
      const saved = await getItem<FormValues>(draftKeyFor(formId));
      if (cancelled || saved === null) return;
      setValues((prev) => ({ ...prev, ...saved }));
      setDraftRestored(true);
      dispatch({ type: 'restoreDraft' });
    })();
    return () => {
      cancelled = true;
    };
    // ⛔ 不依赖 values：那会在每次输入时重放草稿
  }, [draftAllowed, formId, skipDraftRestore]);

  /**
   * 草稿保存：每次值变化都写（输入不丢优先于写入次数；落盘层是 AsyncStorage 小对象）。
   * ⚠️ **`idle` 与 `success` 不写**：否则"刚打开什么都没改"也会留下一份草稿，
   *    下次进来会被当成"有未保存内容"→ **离开确认会在用户没改过任何东西时弹出来**。
   */
  React.useEffect(() => {
    if (!draftAllowed) return;
    if (state.status === 'idle' || state.status === 'success') return;
    void setItem(draftKeyFor(formId), draftableValues(fields, values));
  }, [draftAllowed, formId, fields, values, state.status]);

  const setValue = React.useCallback((name: string, next: unknown) => {
    setValues((prev) => ({ ...prev, [name]: next }));
    dispatch({ type: 'edit', field: name });
  }, []);

  const fieldErrors = React.useMemo<readonly FieldErrorEntry[]>(
    () =>
      Object.entries(state.fieldErrorKeys).map(([name, key]) => ({
        name,
        label: t(fields.find((field) => field.name === name)?.labelKey ?? 'form.error.required'),
        message: t(key),
      })),
    [state.fieldErrorKeys, fields, t]
  );

  const registerFieldRef = React.useCallback((name: string, ref: View | null) => {
    refs.current.set(name, ref);
  }, []);

  const focusField = React.useCallback((name: string) => {
    // 与 `K04` 共用同一套焦点机制（`ErrorSummary` 导出的那个函数）
    const node = refs.current.get(name) ?? null;
    if (node === null) return;
    focusAccessibilityElement(findNodeHandle(node));
  }, []);

  const discardDraft = React.useCallback(async () => {
    if (!draftAllowed) return;
    await removeItem(draftKeyFor(formId));
    setDraftRestored(false);
  }, [draftAllowed, formId]);

  const reset = React.useCallback(() => {
    setValues(initialValues ?? createInitialValues(fields));
    dispatch({ type: 'reset' });
  }, [initialValues, fields]);

  const submit = React.useCallback(async () => {
    if (submittingRef.current) return; // 防重复提交（UI 之外的硬保证）
    dispatch({ type: 'validate:start' });

    const errors = validateAll(fields, values);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'validate:fail', fieldErrorKeys: errors });
      return;
    }

    submittingRef.current = true;
    dispatch({ type: 'submit:start' });
    try {
      await onSubmit(values);
      dispatch({ type: 'submit:success' });
      // 成功即清草稿（否则下次打开会"恢复"上一次已提交的内容）
      if (draftAllowed) await removeItem(draftKeyFor(formId));
    } catch (error) {
      const appError = (error as AppError | undefined) ?? { kind: 'unknown' as const };
      dispatch({ type: 'submit:fail', formError: appError });
    } finally {
      submittingRef.current = false;
    }
  }, [fields, values, onSubmit, draftAllowed, formId]);

  return {
    values,
    state,
    setValue,
    submit,
    reset,
    fieldErrors,
    registerFieldRef,
    focusField,
    shouldConfirmLeave: hasUnsavedChanges(state),
    draftRestored,
    discardDraft,
  };
}

/* ────────────────────────── 组件 ────────────────────────── */

export type FormSectionDescriptor = {
  title: MessageKey;
  description?: MessageKey;
  fields: readonly FormFieldDescriptor[];
};

export type FormLabels = {
  /** 主行动（动词开头，≤6 汉字） */
  submit: string;
  cancel?: string;
  /** `K04` 的标题 */
  errorSummaryTitle: string;
  /** `O03` 的离开确认 */
  leaveTitle: string;
  leaveBody?: string;
  leaveConfirm: string;
  leaveCancel: string;
};

export type FormProps = {
  titleKey?: MessageKey;
  unreadCount?: ScreenProps['unreadCount'];
  onMailboxPress?: ScreenProps['onMailboxPress'];
  /** 路由宿主启用系统返回保护；非导航环境的原语消费者不挂导航 hook。 */
  guardNavigation?: boolean;
  form: UseFormReturn;
  sections: readonly FormSectionDescriptor[];
  labels: FormLabels;
  semantic: SubmitSemantic;
  /** 成功后按 `postSubmitPlan(semantic)` 执行（页面负责真正的跳转/失效） */
  onSettled?: (plan: PostSubmitPlan) => void;
  onCancel?: () => void;
  /** 表单级错误的唯一主行动 */
  onRetrySubmit?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Share discard confirmation and defer removal until the navigation guard is disabled. */
export function useFormLeaveGuard({ dirty, busy, discardDraft }: {
  dirty: boolean;
  busy: boolean;
  discardDraft: () => Promise<void>;
}) {
  const [pendingLeave, setPendingLeave] = React.useState<(() => void) | null>(null);
  const [allowLeave, setAllowLeave] = React.useState(false);
  const [confirmedLeave, setConfirmedLeave] = React.useState<(() => void) | null>(null);
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  React.useEffect(() => { if (confirmedLeave) confirmedLeave(); }, [confirmedLeave]);

  const complete = React.useCallback((resume: () => void) => {
    if (!mounted.current) return;
    setPendingLeave(null);
    setAllowLeave(true);
    setConfirmedLeave(() => resume);
  }, []);
  const requestLeave = React.useCallback((resume: () => void) => {
    if (busy) return;
    if (dirty) setPendingLeave(() => resume);
    else resume();
  }, [busy, dirty]);
  const confirm = React.useCallback(async () => {
    if (!pendingLeave) return;
    const resume = pendingLeave;
    setPendingLeave(null);
    await discardDraft().catch(() => undefined);
    complete(resume);
  }, [pendingLeave, discardDraft, complete]);

  return {
    prevent: !allowLeave && (dirty || busy),
    visible: pendingLeave !== null,
    requestLeave,
    cancel: () => setPendingLeave(null),
    confirm,
    complete,
  };
}

export function Form({
  titleKey,
  unreadCount,
  onMailboxPress,
  guardNavigation = false,
  form,
  sections,
  labels,
  semantic,
  onSettled,
  onCancel,
  onRetrySubmit,
  style,
  testID,
}: FormProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const settledRef = React.useRef(false);

  /* 成功 → 按提交语义交回页面（⛔ 不弹成功对话框：`postSubmitPlan` 里没有这个选项） */
  React.useEffect(() => {
    if (form.state.status !== 'success' || settledRef.current) return;
    settledRef.current = true;
    onSettled?.(postSubmitPlan(semantic));
  }, [form.state.status, onSettled, semantic]);

  const busy = form.state.status === 'submitting';
  const validating = form.state.status === 'validating';
  const leaveGuard = useFormLeaveGuard({ dirty: form.shouldConfirmLeave, busy, discardDraft: form.discardDraft });

  return (
    <Screen bottomMode="own" testID={testID} titleKey={titleKey} unreadCount={unreadCount} onMailboxPress={onMailboxPress}>
      {guardNavigation ? <FormNavigationGuard prevent={leaveGuard.prevent} onBlocked={leaveGuard.requestLeave} /> : null}
      <ScrollView
        // ⛔ 提交中**不得**整屏变灰（§3.2.5-④）：表单保持可用，只有主按钮 loading
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: theme.space('space_6'), padding: theme.space('space_4') }}
      >
        <ErrorSummary
          testID={testID ? `${testID}-summary` : undefined}
          title={labels.errorSummaryTitle}
          fieldErrors={form.fieldErrors}
          formError={form.state.formError}
          onPressField={form.focusField}
          onRetry={onRetrySubmit}
        />

        {sections.map((section) => (
          <FormSection
            key={section.title}
            title={t(section.title)}
            description={section.description ? t(section.description) : undefined}
          >
            {section.fields.map((field) => (
              <FormField
                key={field.name}
                testID={testID ? `${testID}-${field.name}` : undefined}
                field={field}
                value={form.values[field.name]}
                values={form.values}
                onChange={form.setValue}
                errorText={form.fieldErrors.find((entry) => entry.name === field.name)?.message}
                onRegisterRef={form.registerFieldRef}
              />
            ))}
          </FormSection>
        ))}

        {/* 粘性底栏：主行动 + 次行动（§3.2.1 的 Footer） */}
        <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
          <Button
            testID={testID ? `${testID}-submit` : undefined}
            label={labels.submit}
            variant="primary"
            loading={busy || validating}
            onPress={() => {
              void form.submit();
            }}
          />
          {labels.cancel ? (
            <Button
              testID={testID ? `${testID}-cancel` : undefined}
              label={labels.cancel}
              variant="ghost"
              disabled={busy}
              onPress={() => {
                // 有未保存内容就先确认（DirtyGuard）
                leaveGuard.requestLeave(onCancel ?? (() => undefined));
              }}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* DirtyGuard：仅在**真有**未保存内容时触发（§3.2.1） */}
      <AlertDialog
        visible={leaveGuard.visible}
        variant="danger"
        title={labels.leaveTitle}
        body={labels.leaveBody}
        confirmLabel={labels.leaveConfirm}
        cancelLabel={labels.leaveCancel}
        onCancel={leaveGuard.cancel}
        onConfirm={() => { void leaveGuard.confirm(); }}
        testID={testID ? `${testID}-leave` : undefined}
      />
    </Screen>
  );
}

export function FormNavigationGuard({ prevent, onBlocked }: { prevent: boolean; onBlocked: (resume: () => void) => void }): null {
  const navigation = useNavigation();
  usePreventRemove(prevent, ({ data }) => onBlocked(() => navigation.dispatch(data.action)));
  return null;
}
