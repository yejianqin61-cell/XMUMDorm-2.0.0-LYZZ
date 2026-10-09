/**
 * P2A-04 · 发布表单宿主 hook 与提交门控 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：`resolveSubmitGate` 的三态（源缺失 / 明确未接受 / 已接受）；
 *   S-1 接线：宿主把描述符 + 门控 + 去向交给 `K01 Form`，拦住时**一个请求都不发**。
 *
 * 依据：`docs/app/task/phase-2/P2A-04-发布表单宿主hook与提交门控.md`、
 *      宪法 12.2（A-05）、开发设计文档-甲 §6-G4（Q2-A）。
 */
import * as React from 'react';
import { act } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { Text } from '@/components/ui/Text';
import { ToastProvider } from '@/components/ui/Toast';
import { canPersistDraft, draftKeyFor, postSubmitPlan } from '@/components/ui/Form';
import { resolveSubmitGate, canSubmit, TERMS_ROUTE } from '@/features/publish/complianceGate';
import { draftFormIdFor, type PublishFormDescriptor } from '@/features/publish/descriptor';
import { toPublishSubmitError, usePublishFormCore, type PublishFormHost } from '@/features/publish/usePublishForm';
import type { Viewer } from '@/features/publish/registry';

jest.mock('expo-router', () => {
  const state = { replaced: [] as unknown[], pushed: [] as unknown[], backCount: 0 };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      replace: (target: unknown) => state.replaced.push(target),
      back: () => {
        state.backCount += 1;
      },
      canGoBack: () => true,
    }),
  };
});

const routerState = require('expo-router').__state as {
  replaced: unknown[];
  pushed: unknown[];
  backCount: number;
};

/** 无必填字段的描述符：让 `submit()` 能走到 `onSubmit`（否则会先被校验拦下） */
function makeDescriptor(overrides: Partial<PublishFormDescriptor> = {}): PublishFormDescriptor {
  return {
    id: 'confession',
    semantic: 'create',
    sections: [
      {
        title: 'publish.title',
        fields: [{ kind: 'text', name: 'body', labelKey: 'publish.entry.confession' }],
      },
    ],
    submit: jest.fn(async () => ({ id: 42 })),
    routeAfterSubmit: (result) => `/post/${(result as { id?: number })?.id ?? ''}`,
    ...overrides,
  };
}

let hostRef: { current: PublishFormHost | null } = { current: null };

function HostProbe({
  descriptor,
  viewer,
}: {
  descriptor: PublishFormDescriptor;
  viewer: Viewer;
}): React.ReactElement {
  const host = usePublishFormCore(descriptor, viewer);
  hostRef.current = host;
  return <Text testID="gate-state">{host.gate.allowed ? 'allowed' : 'blocked'}</Text>;
}

beforeEach(() => {
  routerState.replaced.length = 0;
  routerState.pushed.length = 0;
  routerState.backCount = 0;
  hostRef = { current: null };
});

describe('P2A-04 发布表单宿主与提交门控', () => {
  it('服务端 TERMS_NOT_ACCEPTED 映射为可打开条款的表单错误', () => {
    expect(toPublishSubmitError({ body: { code: 'TERMS_NOT_ACCEPTED' } })).toEqual({ kind: 'terms' });
    expect(toPublishSubmitError({ body: { code: 'OTHER' } })).toBeNull();
  });

  describe('TC-P2A-04-1A · 条款源缺失（缺口 G4 / Q2-A）', () => {
    it('undefined ⇒ 放行，并打上 bypassed 标记（不是静默放行）', () => {
      const gate = resolveSubmitGate({ signedIn: true });
      expect(gate).toEqual({ allowed: true, bypassed: 'terms-source-missing' });
    });

    it('⛔ 不动 canSubmit 的语义：源缺失只在"宿主"这一层放行', () => {
      // 既有用例 TC-P0-07-6A 要求 canSubmit 对 undefined 必须拦 —— 两层必须分开
      expect(canSubmit({ signedIn: true }).allowed).toBe(false);
      expect(resolveSubmitGate({ signedIn: true })).toEqual({
        allowed: true,
        bypassed: 'terms-source-missing',
      });
      expect(resolveSubmitGate({ signedIn: true, acceptedTerms: false }).allowed).toBe(false);
    });
  });

  describe('TC-P2A-04-2A · 明确未接受 ⇒ 拦住 + 三段文案', () => {
    it('三段文案都在词条表里，且 fix 动词开头（10.4）', () => {
      const gate = resolveSubmitGate({ signedIn: true, acceptedTerms: false });
      expect(gate.allowed).toBe(false);
      if (gate.allowed) return;
      for (const key of [gate.perceiveKey, gate.understandKey, gate.fixKey]) {
        expect(Object.keys(zh)).toContain(key);
      }
      expect(zh[gate.fixKey]).toMatch(/^(打开|接受|修改|重试)/);
      expect(TERMS_ROUTE.startsWith('/')).toBe(true);
    });
  });

  describe('TC-P2A-04-3A · 已接受 ⇒ 放行且无 bypassed 标记', () => {
    it('allowed 为真且没有 bypassed', () => {
      const gate = resolveSubmitGate({ signedIn: true, acceptedTerms: true });
      expect(gate.allowed).toBe(true);
      expect('bypassed' in gate).toBe(false);
    });
  });

  describe('TC-P2A-04-4A · 拦住时一个请求都不发、也不跳转', () => {
    it('第 4 条：submit 未被调用 + 不导航 + 表单进 error 态', async () => {
      const descriptor = makeDescriptor();
      await renderApp(
        <ToastProvider>
          <HostProbe descriptor={descriptor} viewer={{ signedIn: true, acceptedTerms: false }} />
        </ToastProvider>
      );
      expect(hostRef.current?.gate.allowed).toBe(false);

      await act(async () => {
        await hostRef.current?.form.submit();
      });

      expect(descriptor.submit).not.toHaveBeenCalled();
      expect(routerState.replaced).toEqual([]);
      expect(routerState.backCount).toBe(0);
      expect(hostRef.current?.form.state.status).toBe('error');
    });
  });

  describe('TC-P2A-04-5A · 草稿 id 与可落盘性', () => {
    it('默认 `publish:<id>`，且凭据护栏不拒（⛔ 不含 password 段）', () => {
      const descriptor = makeDescriptor();
      expect(draftFormIdFor(descriptor)).toBe('publish:confession');
      expect(canPersistDraft(draftFormIdFor(descriptor))).toBe(true);
      expect(draftKeyFor(draftFormIdFor(descriptor))).toBe('draft:publish:confession');
    });
  });

  describe('TC-P2A-04-6A · 放行时：调用域提交、给回执、按语义去详情页', () => {
    it('create 语义 → 提交结果被记住，onSettled 据此 replace 到详情', async () => {
      const descriptor = makeDescriptor();
      await renderApp(
        <ToastProvider>
          <HostProbe descriptor={descriptor} viewer={{ signedIn: true, acceptedTerms: true }} />
        </ToastProvider>
      );

      await act(async () => {
        await hostRef.current?.form.submit();
      });

      expect(descriptor.submit).toHaveBeenCalledTimes(1);
      expect(hostRef.current?.form.state.status).toBe('success');

      // `K01 Form` 在 status 变 success 后回调 `onSettled`（组件层的行为由 P2A-05 的端到端用例证明）
      await act(async () => {
        hostRef.current?.onSettled(postSubmitPlan('create'));
      });
      expect(routerState.replaced).toEqual(['/post/42']);
      expect(routerState.backCount).toBe(0);
    });

    it('update 语义 → 返回上一屏', async () => {
      const descriptor = makeDescriptor({ semantic: 'update', routeAfterSubmit: undefined });
      await renderApp(
        <ToastProvider>
          <HostProbe descriptor={descriptor} viewer={{ signedIn: true, acceptedTerms: true }} />
        </ToastProvider>
      );
      await act(async () => {
        await hostRef.current?.form.submit();
      });
      await act(async () => {
        hostRef.current?.onSettled(postSubmitPlan('update'));
      });
      expect(routerState.backCount).toBe(1);
      expect(routerState.replaced).toEqual([]);
    });

    it('标签由宿主统一给（域不再各写一份）', async () => {
      await renderApp(
        <ToastProvider>
          <HostProbe descriptor={makeDescriptor()} viewer={{ signedIn: true, acceptedTerms: true }} />
        </ToastProvider>
      );
      const labels = hostRef.current!.labels;
      expect(labels.submit).toBe(zh['publish.submit']);
      expect(labels.cancel).toBe(zh['action.cancel']);
      expect(labels.errorSummaryTitle).toBe(zh['form.summary.title']);
      expect(labels.leaveTitle).toBe(zh['form.leave.title']);
      expect(labels.leaveConfirm).toBe(zh['form.leave.confirm']);
      expect(labels.leaveCancel).toBe(zh['form.leave.cancel']);
    });
  });
});
