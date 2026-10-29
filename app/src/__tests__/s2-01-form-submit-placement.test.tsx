/**
 * S2-01 · 表单骨架的可选提交位（阶段1-02）—— 自动化用例
 *
 * 测什么（S-2 骨架契约 + S-6 安全区）：
 *   1. 默认（inline）：提交按钮在滚动内容里，没有 footer —— 7 个既有消费页零变化；
 *   2. `submitPlacement:'footer'`：动作行走唯一安全区容器的 `footer` 槽；
 *   3. footer 的底部留白由容器算（`TEST_METRICS.insets.bottom = 48`），表单自己不算；
 *   4. footer 模式提交中连点两次，域提交只被调用一次（防重复提交是状态机职责）。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段1-02-表单骨架可选提交位.md`。
 */
import * as React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';

import { renderApp, TEST_METRICS } from './helpers/renderApp';
import { Form, useForm, type FormLabels, type FormSectionDescriptor, type SubmitSemantic } from '@/components/ui/Form';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));

const SECTIONS: readonly FormSectionDescriptor[] = [
  {
    title: 'publish.title',
    fields: [{ kind: 'text', name: 'body', labelKey: 'publish.wall.content' }],
  },
];

const LABELS: FormLabels = {
  submit: '提交',
  cancel: '取消',
  errorSummaryTitle: '请检查填写',
  leaveTitle: '放弃编辑？',
  leaveConfirm: '放弃',
  leaveCancel: '继续编辑',
};

const SEMANTIC: SubmitSemantic = 'create';

function Harness({
  placement,
  onSubmit,
  onCancel,
}: {
  placement?: 'inline' | 'footer';
  onSubmit: () => Promise<void>;
  onCancel?: () => void;
}): React.ReactElement {
  const form = useForm({
    formId: 's2-01-probe',
    fields: SECTIONS.flatMap((section) => section.fields),
    enableDraft: false,
    onSubmit,
  });
  return (
    <Form
      testID="probe"
      form={form}
      sections={SECTIONS}
      labels={LABELS}
      semantic={SEMANTIC}
      submitPlacement={placement}
      onCancel={onCancel}
    />
  );
}

describe('S2-01 表单骨架可选提交位', () => {
  it('默认 inline：提交在滚动内容里，没有 footer', async () => {
    const view = await renderApp(<Harness onSubmit={jest.fn(async () => undefined)} />);
    expect(view.queryByTestId('screen-footer')).toBeNull();
    expect(view.getByTestId('probe-submit')).toBeTruthy();
  });

  it('footer 模式：动作行走 Screen 的 footer 槽', async () => {
    const view = await renderApp(<Harness placement="footer" onSubmit={jest.fn(async () => undefined)} />);
    const footer = view.getByTestId('screen-footer');
    expect(within(footer).getByTestId('probe-submit')).toBeTruthy();
  });

  it('footer 模式：取消按钮也在 footer 内（标签由页面给）', async () => {
    const view = await renderApp(
      <Harness placement="footer" onSubmit={jest.fn(async () => undefined)} onCancel={jest.fn()} />
    );
    const footer = view.getByTestId('screen-footer');
    expect(within(footer).getByTestId('probe-submit')).toBeTruthy();
    expect(within(footer).getByTestId('probe-cancel')).toBeTruthy();
  });

  it('footer 模式的底部留白来自容器（= 48），表单不自算 insets', async () => {
    const view = await renderApp(<Harness placement="footer" onSubmit={jest.fn(async () => undefined)} />);
    const footer = view.getByTestId('screen-footer');
    expect(footer).toHaveStyle({ paddingBottom: TEST_METRICS.insets.bottom });
  });

  it('footer 模式：表单内容区仍然渲染（提交位搬家不等于内容消失）', async () => {
    const view = await renderApp(<Harness placement="footer" onSubmit={jest.fn(async () => undefined)} />);
    expect(view.getByTestId('probe-body')).toBeTruthy();
  });

  /**
   * ⚠️ 本文件最后一个用例：它持有未决 Promise（模拟提交中）。在 RNTL 14 + React 19 下
   *    若夹在中间，会让**后续**用例查不到节点（`helpers/renderApp.tsx` 的头注释记了同类症状）。
   *    收尾显式 unmount，避免把脏状态带给以后新增的用例。
   */
  it('footer 模式：提交中连点两次，域提交只调用一次', async () => {
    let release: (() => void) | null = null;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const view = await renderApp(<Harness placement="footer" onSubmit={onSubmit} />);
    const submit = view.getByTestId('probe-submit');
    fireEvent.press(submit);
    fireEvent.press(submit);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await act(async () => {
      release?.();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => {
      view.unmount();
    });
  });
});
