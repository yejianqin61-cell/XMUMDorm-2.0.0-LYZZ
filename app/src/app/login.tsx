/**
 * 登录页（P1-13「登录最小链路」）
 *
 * ⚠️ **它不是 `P15 鉴权`原型**：`P15`（品牌头 + 表单卡 + 验证码倒计时 + 条款链接）
 * 不在本包的四个骨架里，属后续任务。本页只把**链路**接通：
 * 真实调 `POST /api/auth/login` → 令牌进 `expo-secure-store` → 请求层立刻能带上它。
 * ⛔ 所以这里**没有**注册/找回密码/条款勾选（那些属于 `A-03`/`A-04`/`A-05`）。
 *
 * 用到的既有件：`Screen`（安全区唯一容器）· `Input`（`C04`）· `Button`（`C01`）
 * · `ErrorSummary`（`K04`，三段文案来自 `toErrorCopy`）。
 */

import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { Button } from '@/components/ui/Button';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/session';

export default function LoginScreen(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const session = useSession();

  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  /** 错误直接存 `AppError`：`K04` 会用 `toErrorCopy` 渲染三段文案（⛔ 页面不写文案） */
  const [error, setError] = React.useState<AppError | null>(null);
  const [identifierError, setIdentifierError] = React.useState<string | undefined>(undefined);

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
    setError(result.error);
  };

  return (
    <Screen topMode="topbar" testID="login">
      <ScrollView
        contentContainerStyle={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}
        keyboardShouldPersistTaps="handled"
      >
        <Text role="title" emphasis="strong" colorToken="text-primary">
          {t('auth.title')}
        </Text>

        <ErrorSummary testID="login-summary" title={t('auth.failed')} formError={error} />

        {/* 会话过期被送到这里的（`A-01` 的门）：要说清**为什么**，⛔ 不是普通的"未登录" */}
        {session.status === 'expired' ? (
          <InlineNotice testID="login-expired" tone="warning" message={t('auth.expired')} />
        ) : null}

        <Input
          testID="login-identifier"
          label={t('auth.identifier')}
          value={identifier}
          onChangeText={setIdentifier}
          kind="text"
          errorText={identifierError}
          required
        />
        <Input
          testID="login-password"
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          kind="password"
          required
        />

        <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
          <Button
            testID="login-submit"
            label={t('auth.login')}
            variant="primary"
            loading={submitting}
            onPress={() => {
              void submit();
            }}
          />
          {/* 页面清单：A-03/A-04 的入口就是 A-02（本页）—— ⛔ 不做"藏在设置里的注册" */}
          <Button
            testID="login-to-register"
            label={t('auth.toRegister')}
            variant="ghost"
            onPress={() => router.push('/register')}
          />
          <Button
            testID="login-to-reset"
            label={t('auth.toReset')}
            variant="ghost"
            onPress={() => router.push('/reset-password')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
