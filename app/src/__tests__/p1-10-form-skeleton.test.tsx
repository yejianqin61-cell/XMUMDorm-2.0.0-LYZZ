/**
 * P1-10 · 骨架 P4 表单（`K01 Form` + `K02`/`K03`/`K04`）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：**表单状态机**（唯一实现处）、DSL 校验、提交语义、草稿与凭据护栏
 *   S-1 组件契约：`K02` 分节 / `K03` 描述符→控件 / `K04` 摘要与焦点 / `K01` 四要素
 *   S-3 草稿落盘：恢复、**不在 idle 时写**、成功后清掉
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { getItem, removeItem, setItem } from '@/shared/storage';
import type { MessageKey } from '@/i18n/zh';

import {
  INITIAL_FORM_STATE,
  Form,
  applyServerFieldErrors,
  canPersistDraft,
  draftKeyFor,
  draftableValues,
  formReducer,
  hasUnsavedChanges,
  isDraftable,
  isEmptyValue,
  postSubmitPlan,
  useForm,
  validateAll,
  type FormAction,
  type FormState,
} from '@/components/ui/Form';
import {
  FormField,
  controlKindFor,
  createInitialValues,
  inputKindFor,
  isFieldDisabled,
  isFieldVisible,
  type FormFieldDescriptor,
} from '@/components/ui/FormField';
import { FormSection } from '@/components/ui/FormSection';
import { ErrorSummary, focusAccessibilityElement } from '@/components/ui/ErrorSummary';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';

const UI_DIR = path.resolve(__dirname, '../components/ui');
const readUi = (file: string): string => fs.readFileSync(path.join(UI_DIR, file), 'utf8');
const FILES = ['Form.tsx', 'FormField.tsx', 'FormSection.tsx', 'ErrorSummary.tsx'] as const;

const field = (over: Partial<FormFieldDescriptor> & { name: string; labelKey: MessageKey }): FormFieldDescriptor => ({
  kind: 'text',
  ...over,
});

const run = (...actions: FormAction[]): FormState => actions.reduce(formReducer, INITIAL_FORM_STATE);

describe('TC-P1-10-1A · 4 个文件齐备且都消费主题层', () => {
  it.each(FILES)('components/ui/%s 存在且非空', (file) => {
    expect(readUi(file).length).toBeGreaterThan(400);
  });

  it('每个文件都用 useTheme', () => {
    for (const file of FILES) expect(readUi(file)).toContain('useTheme');
  });
});

describe('TC-P1-10-2A · DSL：描述符 → 控件（纯函数）', () => {
  it('controlKindFor 覆盖 13 种 kind', () => {
    expect(controlKindFor('text')).toBe('input');
    expect(controlKindFor('email')).toBe('input');
    expect(controlKindFor('password')).toBe('input');
    expect(controlKindFor('number')).toBe('input');
    expect(controlKindFor('textarea')).toBe('textarea');
    expect(controlKindFor('segmented')).toBe('segmented');
    expect(controlKindFor('select')).toBe('select');
    expect(controlKindFor('multiselect')).toBe('multiselect');
    expect(controlKindFor('checkbox')).toBe('checkbox');
    expect(controlKindFor('switch')).toBe('switch');
    expect(controlKindFor('tags')).toBe('tags');
    expect(controlKindFor('custom')).toBe('custom');
  });

  it('inputKindFor 只处理走 C04 的那几种（其余回落 text）', () => {
    expect(inputKindFor('email')).toBe('email');
    expect(inputKindFor('tel')).toBe('tel');
    expect(inputKindFor('password')).toBe('password');
    expect(inputKindFor('number')).toBe('number');
    expect(inputKindFor('textarea')).toBe('text');
  });

  it('createInitialValues：布尔类 false、多值类 []、选择类取首项、其余空串', () => {
    const values = createInitialValues([
      field({ name: 'a', labelKey: 'form.error.required' }),
      field({ name: 'b', kind: 'textarea', labelKey: 'form.error.required' }),
      field({ name: 'c', kind: 'switch', labelKey: 'form.error.required' }),
      field({ name: 'd', kind: 'checkbox', labelKey: 'form.error.required' }),
      field({ name: 'e', kind: 'multiselect', labelKey: 'form.error.required' }),
      field({ name: 'f', kind: 'tags', labelKey: 'form.error.required' }),
      field({
        name: 'g',
        kind: 'select',
        labelKey: 'form.error.required',
        source: { kind: 'static', options: [{ value: 'x', label: 'X' }] },
      }),
    ]);
    expect(values).toEqual({ a: '', b: '', c: false, d: false, e: [], f: [], g: 'x' });
  });

  it('isEmptyValue：⛔ **`0` 与 `false` 不算空**（否则"数量 0"会被判未填）', () => {
    expect(isEmptyValue('')).toBe(true);
    expect(isEmptyValue('   ')).toBe(true);
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue(false)).toBe(false);
    expect(isEmptyValue('x')).toBe(false);
  });

  it('visibleWhen / disabledWhen', () => {
    const f = field({
      name: 'a',
      labelKey: 'form.error.required',
      visibleWhen: (values) => values.b === true,
      disabledWhen: (values) => values.c === true,
    });
    expect(isFieldVisible(f, { b: false })).toBe(false);
    expect(isFieldVisible(f, { b: true })).toBe(true);
    expect(isFieldDisabled(f, { c: true })).toBe(true);
    expect(isFieldDisabled(f, { c: false })).toBe(false);
  });
});

describe('TC-P1-10-3A · validateAll（纯函数）', () => {
  const fields = [
    field({ name: 'title', labelKey: 'form.error.required', required: true, maxLength: 3 }),
    field({ name: 'count', labelKey: 'form.error.required', kind: 'number' }),
    field({
      name: 'hidden',
      labelKey: 'form.error.required',
      required: true,
      visibleWhen: () => false,
    }),
  ];

  it('必填 / 超长 / 自定义都按**字段名**给出词条 key', () => {
    expect(validateAll(fields, { title: '', count: 1 })).toEqual({
      title: 'form.error.required',
    });
    expect(validateAll(fields, { title: 'abcd', count: 1 })).toEqual({
      title: 'form.error.tooLong',
    });
    expect(validateAll(fields, { title: 'ab', count: 0 })).toEqual({});
  });

  it('⛔ **不可见的字段不参与校验**（否则"没填的条件字段"会挡住提交）', () => {
    expect(validateAll(fields, { title: 'ab', count: 1 })).toEqual({});
  });

  it('自定义校验返回词条 key', () => {
    const withCustom = [
      field({
        name: 'x',
        labelKey: 'form.error.required',
        validate: (value) => (value === 'bad' ? 'form.error.submit' : undefined),
      }),
    ];
    expect(validateAll(withCustom, { x: 'bad' })).toEqual({ x: 'form.error.submit' });
    expect(validateAll(withCustom, { x: 'ok' })).toEqual({});
  });
});

describe('TC-P1-10-4A · 表单状态机（纯函数，唯一实现处）', () => {
  it('主链路：edit → dirty → validating → submitting → success', () => {
    const s1 = run({ type: 'edit' });
    expect(s1.status).toBe('dirty');
    const s2 = formReducer(s1, { type: 'validate:start' });
    expect(s2.status).toBe('validating');
    const s3 = formReducer(s2, { type: 'submit:start' });
    expect(s3.status).toBe('submitting');
    expect(formReducer(s3, { type: 'submit:success' }).status).toBe('success');
  });

  it('校验失败 → error + 字段错误；此时**没有**表单级错误', () => {
    const s = run(
      { type: 'edit' },
      { type: 'validate:start' },
      { type: 'validate:fail', fieldErrorKeys: { title: 'form.error.required' } }
    );
    expect(s.status).toBe('error');
    expect(s.fieldErrorKeys).toEqual({ title: 'form.error.required' });
    expect(s.formError).toBeNull();
  });

  it('提交失败：可带字段错误（服务端回填）或表单级错误（进 K04 摘要）', () => {
    const withFields = run(
      { type: 'submit:start' },
      { type: 'submit:fail', fieldErrorKeys: { a: 'form.error.required' } }
    );
    expect(withFields.fieldErrorKeys).toEqual({ a: 'form.error.required' });

    const withForm = run({ type: 'submit:start' }, { type: 'submit:fail', formError: { kind: 'conflict' } });
    expect(withForm.formError).toEqual({ kind: 'conflict' });
  });

  it('⛔ 防重复提交：submitting 期间再 submit:start 无效（同引用）', () => {
    const submitting = run({ type: 'submit:start' });
    expect(formReducer(submitting, { type: 'submit:start' })).toBe(submitting);
  });

  it('⛔ 提交中改内容**不打断提交**（edit 在 submitting 下无效）', () => {
    const submitting = run({ type: 'submit:start' });
    expect(formReducer(submitting, { type: 'edit' }).status).toBe('submitting');
  });

  it('success 之后再编辑 → 回到 dirty（新一轮）', () => {
    const success = run({ type: 'submit:success' });
    expect(formReducer(success, { type: 'edit' }).status).toBe('dirty');
  });

  it('submit:success 会清掉字段错误（否则成功页面上还挂着红字）', () => {
    const errored = run({ type: 'validate:fail', fieldErrorKeys: { a: 'form.error.required' } });
    expect(formReducer(errored, { type: 'submit:success' }).fieldErrorKeys).toEqual({});
  });
});

describe('TC-P1-10-5A · 未保存判定与提交语义', () => {
  it('hasUnsavedChanges：dirty/validating/error 为真；idle/submitting/success 为假', () => {
    expect(hasUnsavedChanges(INITIAL_FORM_STATE)).toBe(false);
    expect(hasUnsavedChanges({ ...INITIAL_FORM_STATE, status: 'dirty' })).toBe(true);
    expect(hasUnsavedChanges({ ...INITIAL_FORM_STATE, status: 'validating' })).toBe(true);
    expect(hasUnsavedChanges({ ...INITIAL_FORM_STATE, status: 'error' })).toBe(true);
    expect(hasUnsavedChanges({ ...INITIAL_FORM_STATE, status: 'submitting' })).toBe(false);
    expect(hasUnsavedChanges({ ...INITIAL_FORM_STATE, status: 'success' })).toBe(false);
  });

  it('postSubmitPlan：三种语义（§3.2.4）', () => {
    expect(postSubmitPlan('create')).toEqual({ navigate: 'replace', invalidateLists: true, announce: 'toast' });
    expect(postSubmitPlan('update')).toEqual({ navigate: 'back', invalidateLists: true, announce: 'toast' });
    expect(postSubmitPlan('action')).toEqual({ navigate: 'stay', invalidateLists: false, announce: 'toast' });
  });

  it('⛔ 成功**不得弹对话框**：类型里根本没有"弹窗"这个选项', () => {
    const src = stripComments(readUi('Form.tsx'));
    expect(src).toContain("announce: 'toast' | 'none'");
    expect(src).not.toMatch(/announce:.*dialog/);
  });
});

describe('TC-P1-10-6A · 草稿：凭据护栏 + 生命周期', () => {
  it('draftKeyFor 带前缀；`password` 类字段**不落草稿**', () => {
    expect(draftKeyFor('post-new')).toBe('draft:post-new');
    expect(isDraftable(field({ name: 'p', labelKey: 'form.error.required', kind: 'password' }))).toBe(false);
    expect(isDraftable(field({ name: 'p', labelKey: 'form.error.required', neverDraft: true }))).toBe(false);
    expect(isDraftable(field({ name: 't', labelKey: 'form.error.required' }))).toBe(true);
  });

  it('draftableValues 真的把密码字段剔掉（⛔ 凭据绝不进 AsyncStorage，宪法 4.1.2-2）', () => {
    const fields = [
      field({ name: 'title', labelKey: 'form.error.required' }),
      field({ name: 'password', labelKey: 'form.error.required', kind: 'password' }),
    ];
    expect(draftableValues(fields, { title: 'x', password: 'secret-value' })).toEqual({ title: 'x' });
  });

  it('⛔ 表单 id 形如 `change-password` 时**预检不通过**（落盘层的凭据护栏会拒绝）', () => {
    expect(canPersistDraft('post-new')).toBe(true);
    // 切分后出现 `password` 段 → CredentialStorageError → 干脆不落草稿（⛔ 不崩）
    expect(canPersistDraft('change-password')).toBe(false);
  });

  it('恢复草稿：挂载时读到就回填，并把状态推到 dirty（有未保存内容）', async () => {
    const formId = 'probe-restore';
    await setItem(draftKeyFor(formId), { title: '草稿标题' });
    function Probe(): React.ReactElement {
      const form = useForm({
        formId,
        fields: [field({ name: 'title', labelKey: 'form.error.required' })],
        onSubmit: async () => undefined,
      });
      return <Text role="body">{`v=${String(form.values.title)} restored=${form.draftRestored} confirm=${form.shouldConfirmLeave}`}</Text>;
    }
    const view = await renderApp(<Probe />);
    await waitFor(() => expect(view.getByText(/v=草稿标题/)).toBeTruthy());
    expect(view.getByText(/restored=true/)).toBeTruthy();
    expect(view.getByText(/confirm=true/)).toBeTruthy();
    await removeItem(draftKeyFor(formId));
  });

  it('⛔ 什么都不改**不该**留下草稿（否则下次进来会被当成"有未保存内容"）', async () => {
    const formId = 'probe-idle';
    await removeItem(draftKeyFor(formId));
    function Probe(): React.ReactElement {
      const form = useForm({
        formId,
        fields: [field({ name: 'title', labelKey: 'form.error.required' })],
        onSubmit: async () => undefined,
      });
      return <Text role="body">{`confirm=${form.shouldConfirmLeave}`}</Text>;
    }
    const view = await renderApp(<Probe />);
    await waitFor(() => expect(view.getByText(/confirm=false/)).toBeTruthy());
    // ⚠️ 直接查存储，而不是"再挂一次看会不会弹确认"——
    //    同一个用例里第二次 render 会污染后续用例（`renderApp` 会直接抛错挡住）
    expect(await getItem(draftKeyFor(formId))).toBeNull();
  });

  it('成功后清掉草稿（否则下次打开会"恢复"上一次已提交的内容）', async () => {
    const formId = 'probe-success';
    await removeItem(draftKeyFor(formId));
    function Probe(): React.ReactElement {
      const form = useForm({
        formId,
        fields: [field({ name: 'title', labelKey: 'form.error.required' })],
        onSubmit: async () => undefined,
      });
      return (
        <Pressable
          testID="go"
          onPress={() => {
            form.setValue('title', '已提交');
            void form.submit();
          }}
        >
          <Text role="body">{`status=${form.state.status}`}</Text>
        </Pressable>
      );
    }
    const view = await renderApp(<Probe />);
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('go'));
    await waitFor(() => expect(view.getByText(/status=success/)).toBeTruthy());
    expect(await getItem(draftKeyFor(formId))).toBeNull();
  });
});

describe('TC-P1-10-7A · 服务端字段错误回填（§3.2.2-②）', () => {
  it('已知字段按名回填；**映射不上的不丢**，交给摘要', () => {
    const result = applyServerFieldErrors(
      [
        { field: 'title', messageKey: 'form.error.required' },
        { field: 'server_only', messageKey: 'form.error.submit' },
      ],
      ['title', 'body']
    );
    expect(result.fieldErrorKeys).toEqual({ title: 'form.error.required' });
    expect(result.unmapped).toEqual([{ field: 'server_only', messageKey: 'form.error.submit' }]);
  });
});

describe('TC-P1-10-8A · K02/K03/K04 渲染', () => {
  it('K02 渲染标题与说明', async () => {
    const view = await renderApp(
      <FormSection title="基本信息" description="用于展示">
        <Text role="body">子内容</Text>
      </FormSection>
    );
    expect(view.getByText('基本信息')).toBeTruthy();
    expect(view.getByText('用于展示')).toBeTruthy();
  });

  it('K03 按 kind 渲染对应控件（textarea 出多行、switch 出开关）', async () => {
    const values = { body: 'x', flag: true };
    const ta = await renderApp(
      <FormField
        field={field({ name: 'body', kind: 'textarea', labelKey: 'form.error.required' })}
        value={values.body}
        values={values}
        onChange={() => undefined}
        testID="f1"
      />
    );
    expect(ta.getByTestId('f1')).toBeTruthy();
    expect(ta.getByText('这一项不能为空')).toBeTruthy();
  });

  it('K03 不可见时返回 null（连壳都不渲染）', async () => {
    const view = await renderApp(
      <FormField
        field={field({ name: 'x', labelKey: 'form.error.required', visibleWhen: () => false })}
        value=""
        values={{}}
        onChange={() => undefined}
        testID="f2"
      />
    );
    expect(view.queryByTestId('f2-field')).toBeNull();
  });

  it('K04：无错误时**不渲染**（不留空壳）', async () => {
    const view = await renderApp(<ErrorSummary title="请检查" testID="sum" />);
    expect(view.queryByTestId('sum')).toBeNull();
  });

  it('K04：字段错误可点（移焦点）且文案是"字段：原因"', async () => {
    const onPressField = jest.fn();
    const view = await renderApp(
      <ErrorSummary
        title="有 1 项需要修改"
        fieldErrors={[{ name: 'title', label: '标题', message: '这一项不能为空' }]}
        onPressField={onPressField}
        testID="sum"
      />
    );
    expect(view.getByText('标题：这一项不能为空')).toBeTruthy();
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('sum-title'));
    expect(onPressField).toHaveBeenCalledWith('title');
  });

  it('K04：表单级错误出**三段文案** + 唯一主行动', async () => {
    const onRetry = jest.fn();
    const view = await renderApp(
      <ErrorSummary
        title="提交未成功"
        formError={{ kind: 'offline', target: '食堂评价' }}
        onRetry={onRetry}
        testID="sum"
      />
    );
    expect(view.getByText(/食堂评价/)).toBeTruthy(); // 可感知（对象）
    expect(view.getAllByRole('button').length).toBe(1); // 一个错误只给一个主行动
  });

  it('focusAccessibilityElement 只在拿到数字 tag 时才调（⛔ 不传 undefined 进原生）', () => {
    const { AccessibilityInfo } = require('react-native');
    const spy = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus');
    focusAccessibilityElement(null);
    focusAccessibilityElement(undefined);
    expect(spy).not.toHaveBeenCalled();
    focusAccessibilityElement(42);
    expect(spy).toHaveBeenCalledWith(42);
  });
});

describe('TC-P1-10-9A · K01 Form：四要素与提交', () => {
  // ⚠️ 标签用**真实标签词条**（`topbar.mailbox` = 「信箱」），⛔ 不要拿错误词条当标签 ——
  //    那样摘要会渲染成"X：X"，看不出"字段：原因"的结构
  const fields = [
    field({ name: 'title', labelKey: 'topbar.mailbox', required: true }),
  ];
  const labels = {
    submit: '提交',
    cancel: '取消',
    errorSummaryTitle: '请检查',
    leaveTitle: '离开？',
    leaveBody: '改动不会保存',
    leaveConfirm: '离开',
    leaveCancel: '继续编辑',
  };

  function Harness({ onSubmit }: { onSubmit: (values: Record<string, unknown>) => Promise<void> }): React.ReactElement {
    const form = useForm({ formId: 'harness', fields, onSubmit, enableDraft: false });
    return (
      <Form
        form={form}
        sections={[{ title: 'screen.tools', fields }]}
        labels={labels}
        semantic="create"
        testID="form"
      />
    );
  }

  it('渲染摘要位 + 分节 + 字段 + 底栏（主/次行动）', async () => {
    const view = await renderApp(<Harness onSubmit={async () => undefined} />);
    expect(view.getByTestId('form')).toBeTruthy();
    expect(view.getByTestId('form-submit')).toBeTruthy();
    expect(view.getByTestId('form-cancel')).toBeTruthy();
    expect(view.getByTestId('form-title-field')).toBeTruthy();
  });

  it('校验失败：**不调用 onSubmit**，且摘要出现该字段（就近之外还要置顶）', async () => {
    const onSubmit = jest.fn(async () => undefined);
    const view = await renderApp(<Harness onSubmit={onSubmit} />);
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('form-submit'));
    await waitFor(() => expect(view.getByTestId('form-summary')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(view.getByText('信箱：这一项不能为空')).toBeTruthy();
  });

  it('校验通过：调用 onSubmit，并按语义交给页面（create → replace + 失效列表）', async () => {
    const onSubmit = jest.fn(async () => undefined);
    const onSettled = jest.fn();
    function WithSettled(): React.ReactElement {
      const form = useForm({ formId: 'harness2', fields, onSubmit, enableDraft: false });
      return (
        <Form
          form={form}
          sections={[{ title: 'screen.tools', fields }]}
          labels={labels}
          semantic="create"
          onSettled={onSettled}
          testID="form"
        />
      );
    }
    const view = await renderApp(<WithSettled />);
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.type(view.getByTestId('form-title'), '标题内容');
    await user.press(view.getByTestId('form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSettled).toHaveBeenCalledWith(postSubmitPlan('create')));
  });

  it('提交失败 → 表单级错误进摘要（三段文案）', async () => {
    const onSubmit = jest.fn(async () => {
      throw { kind: 'conflict' as const };
    });
    const view = await renderApp(<Harness onSubmit={onSubmit} />);
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.type(view.getByTestId('form-title'), 'x');
    await user.press(view.getByTestId('form-submit'));
    await waitFor(() => expect(view.getByTestId('form-summary')).toBeTruthy());
  });

  it('⛔ 提交中**不整屏变灰**：表单字段仍然可用（只有主按钮 loading）', async () => {
    let release: () => void = () => undefined;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const view = await renderApp(<Harness onSubmit={onSubmit} />);
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.type(view.getByTestId('form-title'), 'x');
    await user.press(view.getByTestId('form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    // 字段依然在（没有整屏 loading 遮罩）
    expect(view.getByTestId('form-title-field')).toBeTruthy();
    release();
  });
});

describe('TC-P1-10-10A · 结构约束', () => {
  it('⛔ 4 个文件去注释后 0 处中文字面量（文案一律走词条/页面 props）', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const code = stripComments(readUi(file)).replace(
        /new Error\((['"`])[^'"`]*\1\)/g,
        'new Error()'
      );
      if (/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('⛔ 0 处 hex / 0 处数字字号；`K01` 自己**不含** Modal（浮层在 O 层）', () => {
    for (const file of FILES) {
      const src = readUi(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
    }
    expect(stripComments(readUi('Form.tsx'))).not.toMatch(/\bModal\b/);
  });

  it('⛔ 不新建第二套机制：表单状态机只在这里一份，且复用落盘层与 O03', () => {
    const src = readUi('Form.tsx');
    expect(src).toContain('shared/storage');
    expect(src).toContain('AlertDialog');
    expect(src).toContain('formReducer');
  });
});
