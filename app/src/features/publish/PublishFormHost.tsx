/**
 * 发布表单的**页面级组合**（不是组件层！）
 *
 * 三个分支，一个入口：
 *   1. 门禁拦住（后端明确"未接受条款"）→ `TermsGateNotice`（A-05 的拦截点）；
 *   2. 描述符有 → `K01 Form` + `usePublishForm`（装配在 P2A-04）；
 *   3. 描述符还没有（域未交付，账本里记着）→ `PublishUnavailable`（业务空态）。
 *
 * ⛔ 这里**不新建任何 UI 原语**：只用 `components/ui/**` 里已登记的组件。
 * ⛔ 本文件也**不自己包 `Screen`** —— `K01 Form` 内部已经渲染了那唯一的容器；
 *    再包一层就是第二个安全区容器（宪法 17.1-S2）。只有不走 `Form` 的两个分支
 *    才自己起一个 `Screen`。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Form } from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/design-system/theme';
import { useI18n, type MessageKey } from '@/i18n';
import { TERMS_ROUTE, type SubmitGate } from './complianceGate';
import type { PublishFormDescriptor } from './descriptor';
import { PUBLISH_DESCRIPTORS } from './descriptors';
import { useResolvedDescriptor } from './resolveDescriptor';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { usePublishForm } from './usePublishForm';
import {useSession} from '@/features/auth/session';

export type PublishFormHostProps = {
  descriptor: PublishFormDescriptor;
};

/** 发布表单宿主：门禁优先，其次才是表单本身 */
export function PublishFormHost({ descriptor }: PublishFormHostProps): React.ReactElement {
  const session=useSession();
  const identity=`${session.status}:${session.identifier??''}`;
  if (PUBLISH_DESCRIPTORS?.[descriptor.id] !== descriptor) return <ResolvedPublishFormHost key={identity} descriptor={descriptor} />;
  return <RegisteredPublishFormHost key={identity} descriptor={descriptor} />;
}
function RegisteredPublishFormHost({descriptor}: PublishFormHostProps): React.ReactElement {
  const resolved = useResolvedDescriptor(descriptor, true);
  if (resolved.loading || resolved.error) return <Screen titleKey="publish.title" showMailbox={false}>
    {resolved.error ? <ErrorState error={{kind:'unreachable'}} onAction={() => void resolved.retry()} /> : <LoadingState variant="skeleton" />}
  </Screen>;
  return <ResolvedPublishFormHost descriptor={resolved.descriptor} />;
}
function ResolvedPublishFormHost({descriptor}: PublishFormHostProps): React.ReactElement {
  const host = usePublishForm(descriptor);
  const router = useRouter();

  // A-05：门禁是**拦截点**，不是字段错误 —— 所以不渲染表单，只给三要素 + 一个动作
  if (!host.gate.allowed) {
    return <TermsGateNotice gate={host.gate} />;
  }

  return (
    <Form
      testID={`publish-form-${descriptor.id}`}
      guardNavigation
      form={host.form}
      sections={host.sections}
      labels={host.labels}
      semantic={host.semantic}
      onSettled={host.onSettled}
      onCancel={() => router.back()}
    />
  );
}

type BlockedGate = Extract<SubmitGate, { allowed: false }>;

/** A-05 的拦截面：可感知 / 可理解 / 可改正（宪法 10.4 / 12.2） */
function TermsGateNotice({ gate }: { gate: BlockedGate }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  return (
    <Screen testID="publish-terms-gate" topMode="topbar" titleKey="publish.title" bottomMode="none">
      <View style={{ padding: theme.space('space_4'), gap: theme.space('space_3') }}>
        <InlineNotice
          testID="publish-terms-gate-notice"
          tone="warning"
          message={`${t(gate.perceiveKey)}\n${t(gate.understandKey)}`}
        />
        <Button
          testID="publish-terms-gate-fix"
          label={t('publish.gate.terms.button')}
          variant="primary"
          onPress={() => router.push(TERMS_ROUTE)}
        />
      </View>
    </Screen>
  );
}

export type PublishUnavailableProps = {
  /** 顶栏标题用发布类型自己的名字（如"树洞"），⛔ 不用技术性文案 */
  titleKey: MessageKey;
};

/**
 * 已注册但**描述符还没交**的发布类型。
 * ⚠️ 这是**临时状态**：乙丙各交一份描述符，它就少一个（缺口账本在
 *    `descriptors.ts` 的 `KNOWN_MISSING_DESCRIPTORS` 里，用例会盯着它变短）。
 * ⛔ 不用"未知类型"这类技术文案（10.4），也不白屏。
 */
export function PublishUnavailable({ titleKey }: PublishUnavailableProps): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Screen testID="publish-unavailable" topMode="topbar" titleKey={titleKey} bottomMode="none">
      <EmptyState
        testID="publish-unavailable-empty"
        kind="noResult"
        title={t('publish.unavailable.title')}
        actionLabel={t('publish.unavailable.action')}
        onAction={() => router.back()}
      />
    </Screen>
  );
}
