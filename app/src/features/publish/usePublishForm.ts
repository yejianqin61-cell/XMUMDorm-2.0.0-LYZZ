/**
 * 发布表单**宿主**（`P4` 的屏幕层装配）—— 一个 hook，不是一个组件
 *
 * ## 为什么是 hook
 * `P4` 骨架**就是** `K01 Form`（组件定义 §2.7）。再包一个 `FormScreen` 组件就是**套壳**
 * （9.14-②），所以屏幕层要交的是**装配**：
 *
 * ```
 *   描述符 ──▶ usePublishForm ──▶ { form, sections, labels, semantic, onSettled, gate }
 *                                     │
 *                                     └──▶ <Form {...host} />   ← 组件层，原样复用
 * ```
 *
 * 这里做掉四件事，让域文件只剩"字段 + 一个提交函数"：
 *   1. **草稿 id**（`publish:<id>`）与字段展平；
 *   2. **门控**：`resolveSubmitGate`（源缺失放行但标记；明确未接受则拦）；
 *   3. **提交**：把值交给域，结果留在 ref 里（去向要用它，如新建帖的 id）；
 *   4. **去向**：按 `postSubmitPlan(semantic)` 走 replace / back / stay，并给回执 Toast。
 *
 * ⚠️ `invalidateLists`（`postSubmitPlan` 的字段）**在本阶段无法兑现**：App 侧没有任何
 * `useQuery`（`p1-17-canteen.test.tsx:565` 还断言源码里不出现它），所以没有 query 缓存可失效。
 * 口径是「目标页/列表页**聚焦时重新取第一页**」，见[开发设计文档-甲 §1.2-3]。
 */

import * as React from 'react';
import { useRouter } from 'expo-router';

import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { useForm, type FormLabels, type FormSectionDescriptor, type PostSubmitPlan, type SubmitSemantic, type UseFormReturn } from '@/components/ui/Form';
import type { AppError } from '@/i18n/errors';
import { resolveSubmitGate, type SubmitGate } from './complianceGate';
import {
  draftFormIdFor,
  fieldsOf,
  resolvePublishDestination,
  type PublishFormDescriptor,
  type PublishSubmitResult,
} from './descriptor';
import type { Viewer } from './registry';
import { useViewer } from './useViewer';
import {useSession} from '@/features/auth/session';
import {classifyAuthFailure,isSessionInvalid} from '@/features/auth/authFailure';

export function toPublishSubmitError(error: unknown): AppError | null {
  if (error && typeof error === 'object' && 'kind' in error) return error as AppError;
  const body = (error as { body?: { code?: unknown } } | null)?.body;
  if (body?.code === 'TERMS_NOT_ACCEPTED') return { kind: 'terms' };
  return null;
}

export type PublishFormHost = {
  descriptor: PublishFormDescriptor;
  /** 直接喂 `<Form sections />` */
  sections: readonly FormSectionDescriptor[];
  /** 直接喂 `<Form labels />`（固定标签统一在这里给，⛔ 域不再各写一份） */
  labels: FormLabels;
  /** 直接喂 `<Form semantic />` */
  semantic: SubmitSemantic;
  form: UseFormReturn;
  /** `allowed:false` 时**不要渲染表单**（A-05 是拦截点，不是字段错误） */
  gate: SubmitGate;
  /** 直接喂 `<Form onSettled />` */
  onSettled: (plan: PostSubmitPlan) => void;
};

/**
 * 宿主核心：**viewer 由调用方给**。
 *
 * 拆出这一层是为了让"门控 + 提交 + 去向"能**不依赖会话上下文**地被测
 * （不用为了测一条权限规则去起 SessionProvider 和两个网络桩）。
 */
export function usePublishFormCore(
  descriptor: PublishFormDescriptor,
  viewer: Viewer,
  onAuthFailure?: (error: unknown) => Promise<AppError>
): PublishFormHost {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const gate = React.useMemo(() => resolveSubmitGate(viewer), [viewer]);
  // `onSubmit` 是 `useForm` 捕获的闭包，用 ref 让它读到**最新**的门控（⛔ 不用过期闭包）
  const gateRef = React.useRef(gate);
  gateRef.current = gate;

  // ⛔ 必须 memo：`useForm` 的草稿 effect 依赖 `fields`，每次渲染换新数组会每渲染写一次盘
  const fields = React.useMemo(() => fieldsOf(descriptor), [descriptor]);

  /** 提交结果（`create` 的去向要用它，如新建帖 id） */
  const resultRef = React.useRef<PublishSubmitResult | void>(undefined);

  const form = useForm({
    formId: draftFormIdFor(descriptor),
    fields,
    enableDraft: viewer.signedIn,
    onSubmit: async (values) => {
      if (!gateRef.current.allowed) {
        /**
         * 门禁拦住 → ⛔ **不发请求**。
         * 正常路径下宿主**根本不渲染表单**（见 `PublishFormHost` 的 gate 分支），
         * 这里是第二道保险：即便有人绕过 UI，UGC 也发不出去。
         * 抛出的错误只在"绕过 UI"时才会被 `K04` 渲染出来。
         */
        throw { kind: 'permission' } as AppError;
      }
      try {resultRef.current = await descriptor.submit(values);}
      catch(error){
        if(onAuthFailure && isSessionInvalid(classifyAuthFailure(error))) await onAuthFailure(error);
        throw toPublishSubmitError(error) ?? error;
      }
    },
  });

  const onSettled = React.useCallback(
    (plan: PostSubmitPlan) => {
      if (plan.navigate === 'stay') return;
      const destination = resolvePublishDestination(descriptor, resultRef.current);
      if (plan.navigate === 'replace' && destination) {
        // 创建后表单必须从栈中移除。详情改为回执动作显式打开，
        // 这样系统返回始终稳定落在列表，避免回到已提交表单。
        if(descriptor.listAfterSubmit){
          router.replace(descriptor.listAfterSubmit as never);
          if (plan.announce === 'toast') toast.show({
            message: t(descriptor.successKey ?? 'publish.submitted'), tone: 'success',
            actionLabel: t('publish.viewDetail'), onAction: () => router.push(destination),
          });
        }
        else {
          router.replace(destination);
          if (plan.announce === 'toast') toast.show({message: t(descriptor.successKey ?? 'publish.submitted'), tone: 'success'});
        }
        return;
      }
      if (plan.announce === 'toast') toast.show({message: t(descriptor.successKey ?? 'publish.submitted'), tone: 'success'});
      router.back();
    },
    [descriptor, router, t, toast]
  );

  const labels = React.useMemo<FormLabels>(
    () => ({
      submit: t(descriptor.submitLabelKey ?? 'publish.submit'),
      cancel: t('action.cancel'),
      errorSummaryTitle: t('form.summary.title'),
      leaveTitle: t('form.leave.title'),
      leaveBody: t('form.leave.body'),
      leaveConfirm: t('form.leave.confirm'),
      leaveCancel: t('form.leave.cancel'),
    }),
    [descriptor.submitLabelKey, t]
  );

  const sections = descriptor.sections;

  return {
    descriptor,
    sections,
    labels,
    semantic: descriptor.semantic,
    form,
    gate,
    onSettled,
  };
}

/** 宿主：viewer 取自真源（P2A-02） */
export function usePublishForm(descriptor: PublishFormDescriptor): PublishFormHost {
  const { viewer } = useViewer();
  const session=useSession();
  return usePublishFormCore(descriptor, viewer, session.handleAuthFailure);
}
