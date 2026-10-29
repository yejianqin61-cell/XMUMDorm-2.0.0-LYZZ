/**
 * S2-02 · 发布宿主接粘性底栏（阶段1-03）—— 自动化用例
 *
 * 测什么（S-2 宿主 → 表单）：
 *   1. 发布表单有**顶部标题**（A2-11 缺口的另一半）且动作行在 `Screen.footer` 内；
 *   2. 门禁拦住时**没有** footer、没有提交位（被拦页面不给可点的提交）；
 *   3. footer 内提交走既有宿主语义：域 submit 1 次 + 按 `routeAfterSubmit` replace；
 *   4. 提交失败保留输入、出现错误摘要、不跳转。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段1-03-发布宿主接粘性底栏.md`。
 */
import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userEvent, waitFor, within } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { zh } from '@/i18n';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/features/auth/session';
import { PublishFormHost } from '@/features/publish/PublishFormHost';
import type { PublishFormDescriptor } from '@/features/publish/descriptor';

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
    useNavigation: () => ({ dispatch: jest.fn() }),
    useLocalSearchParams: () => ({ type: 'errand' }),
    Redirect: () => null,
  };
});
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/publish/descriptors', () => ({ PUBLISH_DESCRIPTORS: {}, getPublishDescriptor: jest.fn() }));
jest.mock('@/features/publish/useViewer', () => {
  const state = { signedIn: true, acceptedTerms: true, canManageClub: false, isOrgMember: false };
  return { __state: state, useViewer: () => ({ viewer: state, degraded: [], loading: false }) };
});

const routerState = require('expo-router').__state as {
  replaced: unknown[];
  pushed: unknown[];
  backCount: number;
};
const viewerState = require('@/features/publish/useViewer').__state as {
  signedIn: boolean;
  acceptedTerms: boolean;
};

function makeDescriptor(overrides: Partial<PublishFormDescriptor> = {}): PublishFormDescriptor {
  return {
    id: 'errand',
    semantic: 'create',
    sections: [
      {
        title: 'publish.entry.wall',
        fields: [{ kind: 'text', name: 'title', labelKey: 'publish.bing.title', required: true }],
      },
    ],
    submit: jest.fn(async () => ({ id: 7 })),
    routeAfterSubmit: () => '/errand/7',
    ...overrides,
  };
}

const withProviders = (node: React.ReactElement): React.ReactElement => (
  <SessionProvider>
    <ToastProvider>{node}</ToastProvider>
  </SessionProvider>
);

beforeEach(async () => {
  routerState.replaced.length = 0;
  routerState.pushed.length = 0;
  routerState.backCount = 0;
  viewerState.acceptedTerms = true;
  viewerState.signedIn = true;
  await AsyncStorage.clear();
});

describe('S2-02 发布宿主接粘性底栏', () => {
  it('发布表单有顶部标题，且动作行在 footer 槽内', async () => {
    const descriptor = makeDescriptor();
    const view = await renderApp(withProviders(<PublishFormHost descriptor={descriptor} />));

    const footer = view.getByTestId('screen-footer');
    expect(within(footer).getByTestId('publish-form-errand-submit')).toBeTruthy();
    // 顶部标题来自注册表里的发布类型名（⛔ 不是技术性文案）
    expect(view.getByText(zh['publish.entry.errand'])).toBeTruthy();
  });

  it('门禁拦住：只有条款拦截页，没有 footer 与提交位', async () => {
    viewerState.acceptedTerms = false;
    const descriptor = makeDescriptor();
    const view = await renderApp(withProviders(<PublishFormHost descriptor={descriptor} />));

    expect(view.getByTestId('publish-terms-gate')).toBeTruthy();
    expect(view.queryByTestId('screen-footer')).toBeNull();
    expect(view.queryByTestId('publish-form-errand-submit')).toBeNull();
  });

  it('footer 内提交：域 submit 1 次，并按 routeAfterSubmit replace', async () => {
    const descriptor = makeDescriptor();
    const user = userEvent.setup();
    const view = await renderApp(withProviders(<PublishFormHost descriptor={descriptor} />));

    const footer = view.getByTestId('screen-footer');
    await user.type(view.getByTestId('publish-form-errand-title'), '代取快递');
    await user.press(within(footer).getByTestId('publish-form-errand-submit'));

    await waitFor(() => expect(descriptor.submit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(routerState.replaced).toEqual(['/errand/7']));
  });

  it('提交失败：保留输入、出现错误摘要、不跳转', async () => {
    const descriptor = makeDescriptor({
      submit: jest.fn(async () => {
        throw { kind: 'content' };
      }),
    });
    const user = userEvent.setup();
    const view = await renderApp(withProviders(<PublishFormHost descriptor={descriptor} />));

    const input = view.getByTestId('publish-form-errand-title');
    await user.type(input, '代取快递');
    await user.press(within(view.getByTestId('screen-footer')).getByTestId('publish-form-errand-submit'));

    await waitFor(() => expect(view.getByTestId('publish-form-errand-summary')).toBeTruthy());
    expect(view.getByTestId('publish-form-errand-title').props.value).toBe('代取快递');
    expect(routerState.replaced).toEqual([]);
  });
});
