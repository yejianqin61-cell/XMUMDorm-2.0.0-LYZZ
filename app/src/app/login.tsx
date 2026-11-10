/**
 * 登录页：用户确认的双层曲面布局；提交仍沿用 P1-13 的会话与安全令牌链路。
 * 布局见 docs/app/task/login-curve-ui/00-实施计划.md。
 */

import * as React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Mail from 'lucide-react-native/icons/mail';
import Lock from 'lucide-react-native/icons/lock';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';

import { useTheme } from '@/design-system/theme';
import { I18nProvider, useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { Button } from '@/components/ui/Button';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useSession } from '@/features/auth/session';
import { LoginLayout } from '@/features/auth/LoginLayout';

export default function LoginScreen(): React.ReactElement {
  // 登录入口统一英文；子树内的错误摘要和共享控件使用同一语言，退出后不影响 App 设置。
  return (
    <I18nProvider locale="en">
      <LoginContent />
    </I18nProvider>
  );
}

function LoginContent(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const inputAccessibilityCopy = {
    required: t('form.required'),
    separator: t('form.labelSeparator'),
  };
  const session = useSession();

  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  /** 错误直接存 `AppError`：`K04` 会用 `toErrorCopy` 渲染三段文案（⛔ 页面不写文案） */
  const [error, setError] = React.useState<AppError | null>(null);
  const [identifierError, setIdentifierError] = React.useState<
    string | undefined
  >(undefined);

  const submit = async (): Promise<void> => {
    if (submitting) return; // 防重复提交
    if (identifier.trim() === '') {
      setIdentifierError(t('form.error.required'));
      return;
    }
    setIdentifierError(undefined);
    setSubmitting(true);
    setError(null);
    const result = await session.login(identifier, password);
    setSubmitting(false);
    if (result.ok) {
      // 成功后**不弹对话框**（宪法 10.4）：直接回上一屏
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
      return;
    }
    setError({ ...result.error, target: t('auth.login') });
  };

  return (
    <LoginLayout>
      <ErrorSummary
        testID="login-summary"
        title={t('auth.failed')}
        formError={error}
      />

      {/* 会话过期被送到这里的（`A-01` 的门）：要说清**为什么**，⛔ 不是普通的"未登录" */}
      {session.status === 'expired' ? (
        <InlineNotice
          testID="login-expired"
          tone="warning"
          message={t('auth.expired')}
        />
      ) : null}

      <View style={{ gap: theme.space('space_8') }}>
        <Input
          testID="login-identifier"
          label={t('auth.identifier')}
          accessibilityCopy={inputAccessibilityCopy}
          value={identifier}
          onChangeText={setIdentifier}
          kind="email"
          appearance="underline"
          labelPlacement="inline"
          prefix={<Icon source={Mail} size="body" tint="secondary" />}
          errorText={identifierError}
          required
        />
        <Input
          testID="login-password"
          label={t('auth.password')}
          accessibilityCopy={inputAccessibilityCopy}
          value={password}
          onChangeText={setPassword}
          kind={showPassword ? 'text' : 'password'}
          appearance="underline"
          labelPlacement="inline"
          prefix={<Icon source={Lock} size="body" tint="secondary" />}
          suffix={
            <IconButton
              testID="login-toggle-password"
              Icon={showPassword ? EyeOff : Eye}
              accessibilityLabel={
                showPassword ? t('auth.hidePassword') : t('auth.showPassword')
              }
              onPress={() => setShowPassword((shown) => !shown)}
            />
          }
          required
        />
      </View>

      <View style={{ gap: theme.space('space_3') }}>
        <Button
          testID="login-submit"
          label={t('auth.login')}
          variant="primary"
          loading={submitting}
          fullWidth
          // 用户确认稿为平面蓝色 CTA；只在登录页覆盖默认硬偏移，不改变共享按钮。
          style={{
            borderWidth: 0,
            borderRightWidth: 0,
            borderBottomWidth: 0,
            minHeight: theme.touchTarget + theme.space('space_1'),
          }}
          onPress={() => {
            void submit();
          }}
        />
        {/* 页面清单：A-03/A-04 的入口就是 A-02（本页）—— ⛔ 不做"藏在设置里的注册" */}
        <Button
          testID="login-to-register"
          label={t('auth.toRegister')}
          variant="secondary"
          fullWidth
          style={{
            backgroundColor: theme.color['bg-canvas'].value,
            borderColor: theme.color['border-strong'].value,
            minHeight: theme.touchTarget + theme.space('space_1'),
          }}
          onPress={() => router.push('/register')}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Button
          testID="login-to-reset"
          label={t('auth.forgotPassword')}
          variant="link"
          size="small"
          onPress={() => router.push('/reset-password')}
        />
        <Button
          testID="login-terms"
          label={t('auth.terms')}
          variant="link"
          size="small"
          onPress={() => router.push('/me/legal/terms')}
        />
        <Button
          testID="login-privacy"
          label={t('auth.privacy')}
          variant="link"
          size="small"
          onPress={() => router.push('/me/legal/privacy')}
        />
      </View>
    </LoginLayout>
  );
}
