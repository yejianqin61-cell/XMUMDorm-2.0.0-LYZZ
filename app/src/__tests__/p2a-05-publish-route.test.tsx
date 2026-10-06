/**
 * P2A-05 · 发布表单路由接线与端到端证明 —— 自动化用例
 *
 * 测什么（一条细线穿过所有层）：
 *   S-1 页面：`/publish/[type]` → 未知 type 重定向 / 描述符未交走空态 / 描述符有则渲染真表单；
 *   S-1 端到端：填必填 → 提交 → 域 `submit` 被调用 → 按语义 replace 到详情；
 *   S-4：空态分支**不挂宿主**（一个请求都不发）。
 *
 * 依据：`docs/app/task/phase-2/P2A-05-路由接线与端到端证明.md`。
 */
import * as React from 'react';
import { userEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/features/auth/session';
import { PUBLISH_CENTER_ROUTE } from '@/features/navigation/tabConfig';
import { getPublishEntry } from '@/features/publish/registry';
import type { PublishFormDescriptor } from '@/features/publish/descriptor';

jest.mock('expo-router', () => {
  const state = {
    replaced: [] as unknown[],
    pushed: [] as unknown[],
    backCount: 0,
    redirects: [] as unknown[],
    params: { type: 'confession' } as Record<string, string>,
  };
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
    useLocalSearchParams: () => state.params,
    Redirect: ({ href }: { href: unknown }) => {
      state.redirects.push(href);
      return null;
    },
  };
});
jest.mock('@/features/publish/descriptors', () => ({ getPublishDescriptor: jest.fn() }));
jest.mock('../../../shared/api/clubs', () => ({ listMyClubs: jest.fn() }));
jest.mock('../../../shared/api/organizations', () => ({ getMyOrganizations: jest.fn() }));

const routerState = require('expo-router').__state as {
  replaced: unknown[];
  pushed: unknown[];
  backCount: number;
  redirects: unknown[];
  params: Record<string, string>;
};
const descriptors = require('@/features/publish/descriptors') as {
  getPublishDescriptor: jest.Mock;
};
const api = {
  clubs: require('../../../shared/api/clubs') as { listMyClubs: jest.Mock },
  orgs: require('../../../shared/api/organizations') as { getMyOrganizations: jest.Mock },
};

const PublishRoute = require('../app/publish/[type]').default as () => React.ReactElement;

const withProviders = (node: React.ReactElement): React.ReactElement => (
  <SessionProvider>
    <ToastProvider>{node}</ToastProvider>
  </SessionProvider>
);

/** 两分节：一分节一个必填文本，另一分节一个可选长文本 */
function makeDescriptor(overrides: Partial<PublishFormDescriptor> = {}): PublishFormDescriptor {
  return {
    id: 'confession',
    semantic: 'create',
    sections: [
      {
        title: 'secondary.confession',
        fields: [
          { kind: 'text', name: 'body', labelKey: 'publish.entry.confession', required: true },
        ],
      },
      {
        title: 'secondary.wall',
        // ⚠️ labelKey 必须与两个分节标题都不同，否则 `getByText` 会命中两处
        fields: [{ kind: 'textarea', name: 'more', labelKey: 'publish.entry.errand' }],
      },
    ],
    submit: jest.fn(async () => ({ id: 9 })),
    routeAfterSubmit: (result) => `/post/${(result as { id?: number })?.id ?? ''}`,
    ...overrides,
  };
}

beforeEach(() => {
  routerState.replaced.length = 0;
  routerState.pushed.length = 0;
  routerState.backCount = 0;
  routerState.redirects.length = 0;
  routerState.params = { type: 'confession' };
  descriptors.getPublishDescriptor.mockReset();
  api.clubs.listMyClubs.mockReset();
  api.orgs.getMyOrganizations.mockReset();
});

describe('P2A-05 发布表单路由接线与端到端', () => {
  describe('TC-P2A-05-1A · 未知 type → 重定向回发布中心', () => {
    it('找不到注册条目就不渲染任何表单，⛔ 也不显示技术性文案', async () => {
      routerState.params = { type: 'not-a-type' };
      expect(getPublishEntry('not-a-type' as never)).toBeUndefined();

      const view = await renderApp(withProviders(<PublishRoute />));

      expect(routerState.redirects).toEqual([PUBLISH_CENTER_ROUTE]);
      expect(view.queryByTestId('publish-unavailable')).toBeNull();
      expect(descriptors.getPublishDescriptor).not.toHaveBeenCalled();
    });
  });

  describe('TC-P2A-05-2A / 3A · 已注册但描述符未交 → 业务空态，且不发请求', () => {
    it('渲染"暂未开放"空态 + 可返回；⛔ 一个真源请求都不发', async () => {
      descriptors.getPublishDescriptor.mockReturnValue(undefined);
      const user = userEvent.setup();

      const view = await renderApp(withProviders(<PublishRoute />));

      expect(view.getByTestId('publish-unavailable')).toBeTruthy();
      expect(view.getByTestId('publish-unavailable-empty')).toBeTruthy();
      expect(view.getByText(zh['publish.unavailable.title'])).toBeTruthy();
      // 空态分支**不挂宿主** → 不拉 viewer 真源（省两次往返）
      expect(api.clubs.listMyClubs).not.toHaveBeenCalled();
      expect(api.orgs.getMyOrganizations).not.toHaveBeenCalled();

      await user.press(view.getByText(zh['publish.unavailable.action']));
      expect(routerState.backCount).toBe(1);
    });
  });

  describe('TC-P2A-05-4A · 端到端：填 → 提交 → 域提交被调用 → 去详情', () => {
    it('两个分节都渲染，必填校验放行后调用域 submit 并 replace 到新建页', async () => {
      const descriptor = makeDescriptor();
      descriptors.getPublishDescriptor.mockReturnValue(descriptor);
      const user = userEvent.setup();

      const view = await renderApp(withProviders(<PublishRoute />));

      expect(view.getByText(zh['secondary.confession'])).toBeTruthy();
      expect(view.getByText(zh['secondary.wall'])).toBeTruthy();

      // 必填为空时不能提交（校验先拦下）
      await user.press(view.getByTestId('publish-form-confession-submit'));
      expect(descriptor.submit).not.toHaveBeenCalled();

      await user.type(view.getByTestId('publish-form-confession-body'), '今天的树洞');
      await user.press(view.getByTestId('publish-form-confession-submit'));

      await waitFor(() => expect(descriptor.submit).toHaveBeenCalledTimes(1));
      expect(descriptor.submit).toHaveBeenCalledWith(
        expect.objectContaining({ body: '今天的树洞' })
      );
      await waitFor(() => expect(routerState.replaced).toEqual(['/post/9']));
    });
  });

  describe('TC-P2A-05-5A · 域提交失败 → 三要素错误，⛔ 不跳转', () => {
    it('错误摘要出现，且没有发生导航', async () => {
      const descriptor = makeDescriptor({
        submit: jest.fn(async () => {
          throw { kind: 'content' };
        }),
      });
      descriptors.getPublishDescriptor.mockReturnValue(descriptor);
      const user = userEvent.setup();

      const view = await renderApp(withProviders(<PublishRoute />));
      await user.type(view.getByTestId('publish-form-confession-body'), '敏感词');
      await user.press(view.getByTestId('publish-form-confession-submit'));

      await waitFor(() => expect(view.getByTestId('publish-form-confession-summary')).toBeTruthy());
      expect(view.getByText(zh['error.content.perceive'])).toBeTruthy();
      expect(routerState.replaced).toEqual([]);
      expect(routerState.backCount).toBe(0);
    });
  });
});
