/**
 * 注册（`A-03`）—— `P15` 鉴权原型（品牌头 + 表单卡）的**参数化装配**（P2C2-02）
 *
 * ## 为什么用 `K01 Form` 而不是手写
 * 注册是**表单页**：宪法 9.2 要求表单走同一个参数化框架（字段描述符 + 校验 + 提交语义）
 * —— ⛔ 页面手写表单是 §3.2.5-① 明令禁止的。
 *
 * ## 三个 `kind:'custom'` 字段
 * DSL 没有"邮箱 + 发码按钮""六位验证码""倒计时按钮"这三种形态，所以用 `render` 注入：
 *   · **邮箱**：既写进表单值，也镜像到本地 state（发码按钮要读它）；
 *   · **发码行**：`D25 CountdownButton` + **开发期验证码回显**（生产下后端不回传，自然不显示）；
 *   · **验证码**：`C19 OtpInput`。
 *
 * ## 两条口径
 *   · 邮箱硬门槛 `@xmu.edu.my` → 错误文案说清"要什么"（⛔ 不是"格式错误"）；
 *   · 成功后**直接进已登录态**（后端注册接口返回 token）。
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
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { sendVerificationCode } from '../../../../shared/api/auth';
import { useSession } from '@/features/auth/session';
import {
  CODE_LENGTH,
  canSubmitRegister,
  codeErrorKey,
  emailErrorKey,
  passwordErrorKey,
  registerBody,
  revealDevCode,
} from './register';

export function RegisterScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const session = useSession();

  const [email, setEmail] = React.useState('');
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [sendFailed, setSendFailed] = React.useState(false);

  const onSendCode = React.useCallback(async () => {
    setSendFailed(false);
    const errorKey = emailErrorKey(email);
    if (errorKey !== null) {
      // 邮箱不合法就别打扰服务端（省一次必然失败的往返）
      setSendFailed(true);
      return;
    }
    const result = await sendVerificationCode(email.trim());
    if (!result.success) {
      setSendFailed(true);
      return;
    }
    setDevCode(revealDevCode(result));
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
            testID="register-email"
            label={t('auth.email')}
            value={String(value ?? '')}
            kind="email"
            required
            clearable
            clearLabel={t('action.clear')}
            disabled={disabled}
            onChangeText={(next) => {
              setEmail(next); // 发码按钮要读它
              onChange(next);
            }}
          />
        ),
      },
      {
        kind: 'custom',
        name: 'sendCode',
        labelKey: 'auth.sendCode',
        // ⛔ 不落草稿：它不是一个"值"，是一个动作
        neverDraft: true,
        render: () => (
          <View style={{ gap: theme.space('space_2') }}>
            <CountdownButton
              testID="register-send-code"
              label={t('auth.sendCode')}
              formatCountdown={(n) => t('auth.resendIn', { n })}
              onPress={onSendCode}
            />
            {sendFailed ? (
              <InlineNotice testID="register-send-failed" tone="warning" message={t('auth.sendFailed')} />
            ) : null}
            {devCode !== null ? (
              // 只在开发期出现（后端不回传就没有这一行）
              <InlineNotice
                testID="register-dev-code"
                tone="info"
                message={t('auth.devCode', { code: devCode })}
              />
            ) : null}
          </View>
        ),
      },
      {
        kind: 'custom',
        name: 'code',
        labelKey: 'auth.code',
        required: true,
        validate: (value) => codeErrorKey(String(value ?? '')) ?? undefined,
        render: ({ value, onChange, disabled }) => (
          <OtpInput
            testID="register-code"
            label={t('auth.code')}
            value={String(value ?? '')}
            length={CODE_LENGTH}
            disabled={disabled}
            onChangeText={onChange}
          />
        ),
      },
      { kind: 'text', name: 'username', labelKey: 'auth.username', required: true, maxLength: 40 },
      {
        kind: 'password',
        name: 'password',
        labelKey: 'auth.password',
        required: true,
        validate: (value) => passwordErrorKey(String(value ?? '')) ?? undefined,
      },
    ],
    [devCode, onSendCode, sendFailed, t, theme]
  );

  const form = useForm({
    formId: 'auth:register',
    fields,
    onSubmit: async (values) => {
      const errorKey = canSubmitRegister({
        email: String(values.email ?? ''),
        code: String(values.code ?? ''),
        username: String(values.username ?? ''),
        password: String(values.password ?? ''),
      });
      if (errorKey !== null) throw { kind: 'validation', params: { field: t(errorKey) } };
      const result = await session.register(registerBody({
        email: String(values.email ?? ''),
        code: String(values.code ?? ''),
        username: String(values.username ?? ''),
        password: String(values.password ?? ''),
      }));
      if (!result.ok) throw result.error;
    },
  });

  const labels = React.useMemo<FormLabels>(
    () => ({
      submit: t('auth.register'),
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
      testID="register-form"
      form={form}
      sections={[{ title: 'auth.register', fields }]}
      labels={labels}
      semantic="action"
      onSettled={() => router.replace('/(tabs)')}
      onCancel={() => router.replace('/login')}
      onRetrySubmit={() => void form.submit()}
    />
  );
}
