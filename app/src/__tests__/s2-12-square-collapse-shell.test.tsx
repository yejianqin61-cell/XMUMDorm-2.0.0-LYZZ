/**
 * 阶段4-03 · 广场收起与吸顶（外壳行为）
 *
 * 依据：A2-02b（上部随滚动整体收起、五 Tab 吸附在顶部安全区下）、
 *       A2-02c（只有回到顶部继续下拉才展开；中途反向轻滚不展开；各 Tab 位置保留）。
 *
 * 驱动方式：内容域不真滚，而是用 `SquarePaneScroll` 的句柄直接上报数字
 * （这正是阶段4-02 定的接缝）——所以这里断言的是"上报 → 收起"的因果，而不是手势。
 */
import * as React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, within, type RenderResult } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { SquareHome } from '@/features/square/SquareHome';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
  useLocalSearchParams: () => mockParams,
}));

const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockParams: { tab?: string } = {};
/** 由用例控制的"当前滚动位置" —— 上报句柄读它，模拟真实滚动 */
let mockScroll = { y: 0 };

/** 无上报能力的 pane（模拟今日/食堂：自持滚动容器，尚未接一行上报） */
function mockPlainPane(name: string) {
  return function PlainPane() {
    const React = jest.requireActual<typeof import('react')>('react');
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View testID={`pane-${name}`} />;
  };
}

/** 有上报能力的 pane（模拟跑腿：走 ListScreen，自动接上接缝） */
function mockReportingPane(tab: string) {
  return function ReportingPane() {
    const React = jest.requireActual<typeof import('react')>('react');
    const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
    const { useSquarePaneScroll } = jest.requireActual<
      typeof import('@/features/square/SquarePaneScroll')
    >('@/features/square/SquarePaneScroll');
    const handle = useSquarePaneScroll();
    return (
      <View testID={`pane-${tab}`}>
        <Pressable
          testID={`scroll-${tab}`}
          onPress={() => {
            handle?.beginDrag();
            handle?.reportOffset(mockScroll.y);
            handle?.endDrag(mockScroll.y);
          }}
        >
          <View />
        </Pressable>
        <Pressable testID={`offset-${tab}`} onPress={() => handle?.reportOffset(mockScroll.y)}>
          <View />
        </Pressable>
        <Pressable
          testID={`pull-${tab}`}
          onPress={() => {
            handle?.beginDrag();
            handle?.endDrag(0);
          }}
        >
          <View />
        </Pressable>
      </View>
    );
  };
}
jest.mock('@/features/square/TodayPane', () => ({ TodayPane: mockPlainPane('today') }));
jest.mock('@/features/square/CanteenHome', () => ({ CanteenHome: mockPlainPane('canteen') }));
jest.mock('@/features/errand/ErrandScreens', () => ({
  ErrandListScreen: mockReportingPane('errand'),
}));
jest.mock('@/features/campus/CampusScreens', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    CampusFeed: ({ kind }: { kind: string }) => <View testID={`pane-${kind}`} />,
  };
});

const HEADER_HEIGHT = 200;
const layout = (testID: string, height: number) =>
  ({ nativeEvent: { layout: { x: 0, y: 0, width: 412, height } } });

function upperStyle(view: RenderResult): {
  height?: number;
  overflow?: string;
} {
  return StyleSheet.flatten(view.getByTestId('square-upper').props.style) ?? {};
}

function innerStyle(view: RenderResult): {
  height?: number;
  transform?: { translateY: number }[];
} {
  return StyleSheet.flatten(view.getByTestId('square-upper-content').props.style) ?? {};
}

/** 渲染后先量出上部高度，再切到"跑腿"（唯一自动上报的 pane） */
async function renderMeasured(): Promise<any> {
  const view = await renderApp(<SquareHome tabBarHeight={60} />);
  await fireEvent(view.getByTestId('square-upper-content'), 'layout', layout('upper', HEADER_HEIGHT));
  await fireEvent.press(view.getByTestId('top-tab-errand'));
  return view;
}

describe('广场上部收起与 Tab 吸顶', () => {
  it('慢滚：上部按滚动位置线性收起，品牌头先离开', async () => {
    const view = await renderMeasured();
    mockScroll = { y: 100 };
    await fireEvent.press(view.getByTestId('offset-errand'));
    expect(upperStyle(view).height).toBe(HEADER_HEIGHT / 2);
    expect(innerStyle(view).transform?.[0]?.translateY).toBe(-HEADER_HEIGHT / 2);
  });

  it('甩动到底：完整收起，Tab 条仍在', async () => {
    const view = await renderMeasured();
    mockScroll = { y: 900 };
    await fireEvent.press(view.getByTestId('offset-errand'));
    expect(upperStyle(view).height).toBe(0);
    expect(view.getByTestId('square-module-tabs')).toBeTruthy();
  });

  it('中途反向轻滚不展开（冻结在上一次进度）', async () => {
    const view = await renderMeasured();
    mockScroll = { y: 900 };
    await fireEvent.press(view.getByTestId('offset-errand'));
    mockScroll = { y: 40 };
    await fireEvent.press(view.getByTestId('offset-errand'));
    expect(upperStyle(view).height).toBe(0);
  });

  it('回到顶部继续下拉才展开', async () => {
    const view = await renderMeasured();
    mockScroll = { y: 900 };
    await fireEvent.press(view.getByTestId('offset-errand'));
    // 先滚回顶部：只回到顶部不展开（A2-02c）
    mockScroll = { y: 0 };
    await fireEvent.press(view.getByTestId('offset-errand'));
    expect(upperStyle(view).height).toBe(0);
    // 在顶部继续下拉（整段手势没离开顶部）→ 展开
    await fireEvent.press(view.getByTestId('pull-errand'));
    expect(upperStyle(view).height).toBe(HEADER_HEIGHT);
  });

  it('未接上报的 Tab（今日）保持上部常驻', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-upper-content'), 'layout', layout('upper', HEADER_HEIGHT));
    expect(upperStyle(view).height).toBe(HEADER_HEIGHT);
    expect(view.getByTestId('pane-today')).toBeTruthy();
  });

  it('各 Tab 用自己的滚动位置：切回原 Tab 仍是收起态', async () => {
    const view = await renderMeasured();
    mockScroll = { y: 900 };
    await fireEvent.press(view.getByTestId('offset-errand'));
    expect(upperStyle(view).height).toBe(0);
    await fireEvent.press(view.getByTestId('top-tab-today'));
    expect(upperStyle(view).height).toBe(HEADER_HEIGHT);
    await fireEvent.press(view.getByTestId('top-tab-errand'));
    expect(upperStyle(view).height).toBe(0);
  });

  it('只有一个 Tab 条，且吸顶在 Screen header 里（不越过顶部安全区）', async () => {
    const view = await renderMeasured();
    expect(view.getAllByTestId('square-module-tabs')).toHaveLength(1);
    expect(within(view.getByTestId('screen-header')).getByTestId('square-module-tabs')).toBeTruthy();
    for (const key of ['today', 'confession', 'wall', 'canteen', 'errand']) {
      expect(view.getByTestId(`top-tab-${key}`)).toBeTruthy();
    }
  });
});
