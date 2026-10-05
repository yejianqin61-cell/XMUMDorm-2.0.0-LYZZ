/**
 * P0-02 · 主题层渲染用例（TC-P0-02 的 Provider 路径）
 *
 * ⚠️ `@testing-library/react-native@14` 的 `render` **返回 Promise**（concurrent root），
 *    因此每个用例都必须 `await render(...)` —— 否则组件还没提交，读到的主题会是 undefined。
 *
 * 依据：App 设计宪法 9.12-②（colorScheme 显式，不用 unspecified）/ 7.3（reduced-motion 降级）
 */
import * as React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider, useTheme, type Theme } from '@/design-system/theme';

let captured: Theme | undefined;

function Probe(): React.ReactElement | null {
  captured = useTheme();
  return null;
}

async function renderWithTheme(props: {
  source?: 'dark' | 'light' | 'system';
  systemScheme?: 'dark' | 'light' | null;
}): Promise<void> {
  await render(
    <ThemeProvider source={props.source} systemScheme={props.systemScheme}>
      <Probe />
    </ThemeProvider>
  );
}

describe('P0-02 主题层', () => {
  beforeEach(() => {
    captured = undefined;
  });

  it('source=dark 时生效方案为 dark，且色表取自暗色令牌', async () => {
    await renderWithTheme({ source: 'dark', systemScheme: 'light' });
    expect(captured?.scheme).toBe('dark');
    expect(captured?.color['bg-canvas'].theme).toBe('dark');
  });

  it('source=light 时生效方案为 light（即使系统是暗色）', async () => {
    await renderWithTheme({ source: 'light', systemScheme: 'dark' });
    expect(captured?.scheme).toBe('light');
    expect(captured?.color['bg-canvas'].theme).toBe('light');
  });

  it('source=system 时跟随 systemScheme', async () => {
    await renderWithTheme({ source: 'system', systemScheme: 'dark' });
    expect(captured?.scheme).toBe('dark');
  });

  it('source=system 且系统值未知时，落在合法取值之一（⛔ 不是 undefined / unspecified）', async () => {
    await renderWithTheme({ source: 'system', systemScheme: null });
    expect(['dark', 'light']).toContain(captured?.scheme);
  });

  it('主题对象暴露的是"已转成 number"的非颜色令牌', async () => {
    await renderWithTheme({ source: 'dark' });
    expect(captured?.space('space_4')).toBe(16);
    expect(captured?.radius('radius_medium')).toBe(12);
    expect(captured?.borderWidth('border_width_hairline')).toBe(1);
    expect(captured?.motionDuration('motion_duration_fast')).toBe(120);
  });

  it('触控目标按平台取官方值（iOS 44 / Android 48，⛔ 不取交集）', async () => {
    await renderWithTheme({ source: 'dark' });
    expect([44, 48]).toContain(captured?.touchTarget);
  });

  it('reduceMotion 是布尔值（宪法 7.3 的降级开关必须有来源）', async () => {
    await renderWithTheme({ source: 'dark' });
    expect(typeof captured?.reduceMotion).toBe('boolean');
  });

  it('两套主题的令牌名集合一致（暗色不许漏键）', async () => {
    await renderWithTheme({ source: 'dark' });
    const darkKeys = Object.keys(captured?.color ?? {}).sort();
    await renderWithTheme({ source: 'light' });
    const lightKeys = Object.keys(captured?.color ?? {}).sort();
    expect(darkKeys).toEqual(lightKeys);
  });
});
