/**
 * 阶段A-06 · 表单骨架的预览槽（真实 Form，不 mock）
 *
 * 单独成文件：宿主用例整模块 mock 了 `Form`，同一文件里再测真实骨架会互相打架。
 */
import * as React from 'react';
import { Text } from 'react-native';

import { renderApp } from './helpers/renderApp';
import { Form, useForm } from '@/components/ui/Form';

const fields = [{ name: 'content', kind: 'text' as const, labelKey: 'topbar.mailbox' as const }];
const labels = {
  submit: '提交',
  cancel: '取消',
  errorSummaryTitle: '请检查',
  leaveTitle: '离开？',
  leaveBody: '改动不会保存',
  leaveConfirm: '离开',
  leaveCancel: '继续编辑',
};

function Harness({ withPreview }: { withPreview: boolean }): React.ReactElement {
  const form = useForm({
    formId: 'preview-harness',
    fields,
    onSubmit: async () => undefined,
    enableDraft: false,
  });
  return (
    <Form
      form={form}
      sections={[{ title: 'screen.tools', fields }]}
      labels={labels}
      semantic="create"
      preview={withPreview ? <Text testID="preview-slot">预览</Text> : undefined}
    />
  );
}

describe('表单骨架的预览槽（阶段A-06）', () => {
  it('传了预览槽就渲染在表单内容里', async () => {
    const view = await renderApp(<Harness withPreview />);
    expect(view.getByTestId('preview-slot')).toBeTruthy();
  });

  it('不传时既有表单零变化', async () => {
    const view = await renderApp(<Harness withPreview={false} />);
    expect(view.queryByTestId('preview-slot')).toBeNull();
    expect(view.getByTestId('screen-content')).toBeTruthy();
  });
});
