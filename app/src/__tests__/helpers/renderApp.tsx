/**
 * 组件渲染用例的**唯一入口**（`renderApp`）
 *
 * ⚠️ **为什么必须有它**：P1-08 实测到一个极难定位的坑 ——
 *   **在同一个 `it` 里调用两次 `render()`，会污染*后续*用例**：
 *   后面的 `getByTestId` / `getByText` 全部报 "Unable to find an element"，
 *   而**失败的是另一个用例**，看不出与"多渲染了一次"有关系。
 *   实测复现（RNTL 14 + React 19 并发根）：
 *   - 用例 A 渲染两次 → 用例 B 的渲染查不到任何节点；
 *   - 在两次渲染之间 `await cleanup()` **更糟**：A 的第二次渲染也查不到了。
 *   结论：**一个 `it` 只渲染一次**。
 *
 * 所以这里做了两件事：
 *   1. 把 Provider 接线收在一处（`ThemeProvider` + `I18nProvider`，需要时再包 `Screen`）；
 *   2. **第二次调用直接抛错并说明原因** —— 把"几层之后才炸"的隐晦症状
 *      变成"就在犯错那一行炸"，并给出改法（拆用例 / 先 unmount）。
 *
 * ⛔ 不要在用例里直接 `render()`；需要两个视图同屏比较时，请把它们放进**同一个**渲染树。
 */

import * as React from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/design-system/theme';
import { I18nProvider, type Locale } from '@/i18n';
import { Screen } from '@/components/ui/Screen';

/** 骨架规范 §6.4 的机型矩阵取值（测试里用一台标准 Android 手机） */
export const TEST_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 24, bottom: 48, left: 0, right: 0 },
};

let renderedThisTest = false;

// 每个用例结束后解锁（`clearMocks` 不管这个，所以自己重置）
afterEach(() => {
  renderedThisTest = false;
});

export type RenderAppOptions = {
  locale?: Locale;
  /** 需要 `useScreenInsets()` 的组件（覆盖层 / 底部输入）必须包一层 `Screen` */
  inScreen?: boolean;
  scheme?: 'light' | 'dark';
};

export async function renderApp(
  node: React.ReactElement,
  options: RenderAppOptions = {}
): Promise<RenderResult> {
  if (renderedThisTest) {
    throw new Error(
      'renderApp 在同一用例里被调用两次 —— RNTL 14 下这会污染**后续**用例' +
        '（症状是别的用例报 "Unable to find an element"）。请拆成两个 it，' +
        '或先 await result.unmount() 再渲染第二个视图。'
    );
  }
  renderedThisTest = true;

  const { locale = 'zh', inScreen = false, scheme = 'dark' } = options;
  const tree = (
    <ThemeProvider source={scheme} systemScheme={scheme}>
      <I18nProvider locale={locale}>
        {inScreen ? <Screen bottomMode="own">{node}</Screen> : node}
      </I18nProvider>
    </ThemeProvider>
  );

  return render(
    inScreen ? <SafeAreaProvider initialMetrics={TEST_METRICS}>{tree}</SafeAreaProvider> : tree
  );
}
