/**
 * 找回密码（`A-04`）—— 一页三步（P2C2-03）
 *
 * 与注册**共用**同一条验证码链路：`D25 CountdownButton`、`C19 OtpInput`、邮箱域名判定
 * 都从 `register.ts` / `CountdownButton` 复用，⛔ 不另起一套。
 *
 * 收尾口径：重置成功后**回登录页**并给回执 —— 否则用户会以为"重置完就登录了"。
 * 回执走全局 `Toast`（⛔ 不给登录页加路由参数：那是为了一个提示改动登录页的契约）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Form, useForm, type FormLabels } from '@/components/ui/Form';
import type { FormFieldDescriptor } from '@/components/ui/FormField';
import { CountdownButton } from '@/components/ui/CountdownButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Input } from '@/components/ui/Input';
import { OtpInput } from '@/components/ui/OtpInput';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { sendResetCode, resetPassword } from '../../../../shared/api/auth';
import { CODE_LENGTH, emailErrorKey, codeErrorKey } from './register';
import { canSubmitReset, resetBody, resetStepFor } from './reset';

export function ResetPasswordScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [sendFailed, setSendFailed] = React.useState(false);

  const step = resetStepFor(codeSent);

  const onSendCode = React.useCallback(async () => {
    setSendFailed(false);
    if (emailErrorKey(email) !== null) {
      setSendFailed(true);
      return;
    }
    const result = await sendResetCode(email.trim());
    if (!result.success) {
      // 服务端知道这个邮箱存不存在（`send-reset-code` 会检查）→ **如实转达**，⛔ 不自己发明隐私策略
      setSendFailed(true);
      return;
    }
    setCodeSent(true);
    setDevCode(typeof result.verificationCode === 'string' ? result.verificationCode : null);
  }, [email]);

  const fields = React.useMemo<readonly FormFieldDescriptor[]>(
    () => [
      {
        kind: 'custom',
        name: 'email',
        labelKey: 'auth.email',
        required: true,
        validate: (value) => emailErrorKey(String(value ?? '')) ?? undefined,
        render: ({ value, onChange, disabled }) => (
          <Input
            testID="reset-email"
            label={t('auth.email')}
            value={String(value ?? '')}
            kind="email"
            required
            clearable
            clearLabel={t('action.clear')}
            disabled={disabled || codeSent}
            onChangeText={(next) => {
              setEmail(next);
              onChange(next);
            }}
          />
        ),
      },
      {
        kind: 'custom',
        name: 'sendCode',
        labelKey: 'auth.sendCode',
        neverDraft: true,
        render: () => (
          <View style={{ gap: theme.space('space_2') }}>
            <CountdownButton
              testID="reset-send-code"
              label={t('auth.sendCode')}
              formatCountdown={(n) => t('auth.resendIn', { n })}
              onPress={onSendCode}
            />
            {sendFailed ? (
              <InlineNotice testID="reset-send-failed" tone="warning" message={t('auth.sendFailed')} />
            ) : null}
            {devCode !== null ? (
              <InlineNotice testID="reset-dev-code" tone="info" message={t('auth.devCode', { code: devCode })} />
            ) : null}
          </View>
        ),
      },
      // ⛔ 没发过码就不显示后两步（"未发码也能提交"这个洞从结构上就不存在）
      ...(step === 'confirm'
        ? ([
            {
              kind: 'custom',
              name: 'code',
              labelKey: 'auth.code',
              required: true,
              validate: (value: unknown) => codeErrorKey(String(value ?? '')) ?? undefined,
              render: ({ value, onChange, disabled }: { value: unknown; onChange: (next: unknown) => void; disabled: boolean }) => (
                <OtpInput
                  testID="reset-code"
                  label={t('auth.code')}
                  value={String(value ?? '')}
                  length={CODE_LENGTH}
                  disabled={disabled}
                  onChangeText={onChange}
                />
              ),
            },
            {
              kind: 'password',
              name: 'newPassword',
              labelKey: 'auth.newPassword',
              required: true,
            },
          ] as FormFieldDescriptor[])
        : []),
    ],
    [codeSent, devCode, onSendCode, sendFailed, step, t, theme]
  );

  const form = useForm({
    formId: 'auth:reset',
    fields,
    onSubmit: async (values) => {
      const errorKey = canSubmitReset(
        {
          email: String(values.email ?? ''),
          code: String(values.code ?? ''),
          newPassword: String(values.newPassword ?? ''),
        },
        codeSent
      );
      if (errorKey !== null) throw { kind: 'validation', params: { field: t(errorKey) } };
      const result = await resetPassword(
        resetBody({
          email: String(values.email ?? ''),
          code: String(values.code ?? ''),
          newPassword: String(values.newPassword ?? ''),
        })
      );
      // 业务失败走 200 + message（`requestRaw` 不抛）→ 当成可改正的失败抛出
      if (!result.success) throw { kind: 'validation', params: { field: result.message ?? '' } };
    },
  });

  const labels = React.useMemo<FormLabels>(
    () => ({
      submit: t('auth.resetSubmit'),
      cancel: t('action.cancel'),
      errorSummaryTitle: t('form.summary.title'),
      leaveTitle: t('form.leave.title'),
      leaveBody: t('form.leave.body'),
      leaveConfirm: t('form.leave.confirm'),
      leaveCancel: t('form.leave.cancel'),
    }),
    [t]
  );

  return (
    <Form
      testID="reset-form"
      form={form}
      sections={[{ title: 'auth.toReset', fields }]}
      labels={labels}
      semantic="action"
      onSettled={() => {
        // 回执 + 回登录页：新密码要用户自己用一次，⛔ 不直接进已登录态
        toast.show({ message: t('auth.resetDone'), tone: 'success' });
        router.replace('/login');
      }}
      onCancel={() => router.replace('/login')}
      onRetrySubmit={() => void form.submit()}
    />
  );
}
