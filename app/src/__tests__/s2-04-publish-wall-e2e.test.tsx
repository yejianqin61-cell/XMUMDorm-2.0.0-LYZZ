/**
 * S2-04 · 发布链路端到端：万能墙表单（阶段1-05）—— 自动化用例
 *
 * 测什么（一条细线穿过所有层，S-2 + S-6）：
 *   1. 真实域描述符（`createWallPublishDescriptor`）+ 真实宿主核心 + footer 提交位 → 域接口被调用 1 次并跳转；
 *   2. 接口失败：正文保留、错误摘要出现、不跳转；
 *   3. footer 的底部留白来自容器（`TEST_METRICS.insets.bottom = 48`）。
 *
 * ⚠️ 交互统一用 `userEvent`：本用例包了 `SessionProvider`（异步水合），`fireEvent` 的同步
 *    act 会让"改值 → 提交"的读值时序错开（实测提交读到空值）。这是既有 `p2a-05` 的同一写法。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段1-05-万能墙表单端到端.md`。
 */
import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userEvent, waitFor, within } from '@testing-library/react-native';

import { renderApp, TEST_METRICS } from './helpers/renderApp';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/features/auth/session';
import { PublishFormHost } from '@/features/publish/PublishFormHost';
import { createWallPublishDescriptor } from '@/features/campus/publishFields';
import { useI18n } from '@/i18n';
import { createConfession } from '../../../shared/api/confessions';
import { CONFESSION_TEMPLATES } from '../../../shared/constants/confessionTemplates';

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
    useLocalSearchParams: () => ({ type: 'wall' }),
    Redirect: () => null,
  };
});
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/publish/descriptors', () => ({ PUBLISH_DESCRIPTORS: {}, getPublishDescriptor: jest.fn() }));
jest.mock('@/features/publish/useViewer', () => {
  const state = { signedIn: true, acceptedTerms: true, canManageClub: false, isOrgMember: false };
  return { __state: state, useViewer: () => ({ viewer: state, degraded: [], loading: false }) };
});
jest.mock('../../../shared/api/confessions', () => ({ createConfession: jest.fn() }));

const routerState = require('expo-router').__state as { replaced: unknown[]; pushed: unknown[]; backCount: number };
const createConfessionMock = createConfession as jest.Mock;
const TEMPLATE_KEY = CONFESSION_TEMPLATES[0].key;

function WallHost(): React.ReactElement {
  const { t } = useI18n();
  const descriptor = React.useMemo(() => createWallPublishDescriptor(t), [t]);
  return <PublishFormHost descriptor={descriptor} />;
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
  createConfessionMock.mockReset();
  await AsyncStorage.clear();
});

describe('S2-04 万能墙表单端到端', () => {
  it('从 footer 提交：域接口 1 次，并按既定向 replace 回广场墙 Tab', async () => {
    createConfessionMock.mockResolvedValue({ id: 88 });
    const user = userEvent.setup();
    const view = await renderApp(withProviders(<WallHost />));

    // 模板是 segmented，选第一项（值来自共享常量，⛔ 不硬编码）
    await user.press(view.getByTestId(`publish-form-wall-template_key-${TEMPLATE_KEY}`));
    await user.type(view.getByTestId('publish-form-wall-content'), '今天食堂排队好长');
    await user.press(within(view.getByTestId('screen-footer')).getByTestId('publish-form-wall-submit'));

    await waitFor(() => expect(createConfessionMock).toHaveBeenCalledTimes(1));
    expect(createConfessionMock).toHaveBeenCalledWith({
      content: '今天食堂排队好长',
      template_key: TEMPLATE_KEY,
    });
    await waitFor(() => expect(routerState.replaced).toEqual(['/?tab=wall']));
  });

  it('接口失败：正文保留、出现错误摘要、不跳转', async () => {
    createConfessionMock.mockRejectedValue({ kind: 'unreachable' });
    const user = userEvent.setup();
    const view = await renderApp(withProviders(<WallHost />));

    await user.press(view.getByTestId(`publish-form-wall-template_key-${TEMPLATE_KEY}`));
    await user.type(view.getByTestId('publish-form-wall-content'), '今天食堂排队好长');
    await user.press(within(view.getByTestId('screen-footer')).getByTestId('publish-form-wall-submit'));

    await waitFor(() => expect(view.getByTestId('publish-form-wall-summary')).toBeTruthy());
    expect(view.getByTestId('publish-form-wall-content').props.value).toBe('今天食堂排队好长');
    expect(routerState.replaced).toEqual([]);
  });

  it('footer 的底部留白来自容器：48（不在表单里）', async () => {
    const view = await renderApp(withProviders(<WallHost />));
    expect(view.getByTestId('screen-footer')).toHaveStyle({ paddingBottom: TEST_METRICS.insets.bottom });
  });
});
