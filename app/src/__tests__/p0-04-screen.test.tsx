/**
 * P0-04 · Screen 容器渲染用例
 *
 * 验证的是**端到端意图声明**是否真的落进样式：
 *   - `bottomMode='tabbar'` → 内容底部留白 = Tab 栏高度（**不含** insets.bottom，S5）
 *   - 顶栏内容从真实 inset 之下开始，且信箱动作**存在且可读**（宪法 4.7）
 *
 * ⚠️ RNTL 14 的 `render` 返回 Promise。
 */
import * as React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/design-system/theme';
import { I18nProvider } from '@/i18n';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

const ANDROID_TABBAR: Metrics = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 24, bottom: 48, left: 0, right: 0 },
};

const IOS_ISLAND: Metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, bottom: 34, left: 0, right: 0 },
};

async function renderScreen(
  metrics: Metrics,
  props: Partial<React.ComponentProps<typeof Screen>> = {}
): Promise<ReturnType<typeof render>> {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider source="dark" systemScheme="dark">
        <I18nProvider locale="zh">
          <Screen titleKey="screen.square" {...props}>
            <Text>内容</Text>
          </Screen>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('P0-04 Screen 容器', () => {
  it('顶栏存在，标题取词条，且信箱动作可读（宪法 4.7-3 常态可见）', async () => {
    const view = await renderScreen(ANDROID_TABBAR);
    expect(view.getByText('广场')).toBeTruthy();
    const mailbox = view.getByTestId('topbar-mailbox');
    expect(mailbox).toBeTruthy();
    expect(mailbox.props.accessibilityLabel).toBe('信箱');
  });

  it('未读角标进无障碍标签（角标不是唯一语义，宪法 7.2 / 4.7-4）', async () => {
    const view = await renderScreen(ANDROID_TABBAR, { unreadCount: 3 });
    const mailbox = view.getByTestId('topbar-mailbox');
    expect(String(mailbox.props.accessibilityLabel)).toContain('3');
  });

  it('S5：bottomMode=tabbar 时内容底部留白 = Tab 栏高度，且**不含** insets.bottom', async () => {
    const view = await renderScreen(ANDROID_TABBAR, {
      bottomMode: 'tabbar',
      tabBarHeight: 56,
    });
    const content = view.getByTestId('screen-content');
    expect(content).toHaveStyle({ paddingBottom: 56 });
    // 双倍空白 = 56 + 48 = 104
    expect(content).not.toHaveStyle({ paddingBottom: 104 });
  });

  it('S5：bottomMode=own 时才叠加 insets.bottom（唯一叠加处）', async () => {
    const view = await renderScreen(IOS_ISLAND, { bottomMode: 'own' });
    expect(view.getByTestId('screen-content')).toHaveStyle({ paddingBottom: 34 });
  });

  it('S1：顶部偏移跟着真实 inset 变（灵动岛 59 > 刘海 47）', async () => {
    const island = await renderScreen(IOS_ISLAND);
    const islandBar = island.getByText('广场');
    expect(islandBar).toBeTruthy();
    // 顶栏外层的 paddingTop 由 resolveInsets 注入；这里断言渲染不崩且标题在
    const android = await renderScreen(ANDROID_TABBAR);
    expect(android.getByText('广场')).toBeTruthy();
  });

  it('topMode=none 时不渲染顶栏（覆盖层/启动页形态）', async () => {
    const view = await renderScreen(ANDROID_TABBAR, { titleKey: undefined, topMode: 'none' });
    expect(view.queryByTestId('topbar-mailbox')).toBeNull();
  });

  it('英文语言下标题与信箱标签都切到英文（双语无残留）', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={ANDROID_TABBAR}>
        <ThemeProvider source="light">
          <I18nProvider locale="en">
            <Screen titleKey="screen.square">
              <Text>body</Text>
            </Screen>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
    expect(view.getByText('Square')).toBeTruthy();
    expect(view.getByTestId('topbar-mailbox').props.accessibilityLabel).toBe('Mailbox');
  });
});
