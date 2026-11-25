/**
 * P3A5 · 广场首页同页模块 Tab（2026-10-18 集合改造后）
 *
 * 依据：`docs/app/task/广场今日页/T4-广场骨架改造.md`
 *   · 默认落到「今日」；打开 App 无参数 = 今日；
 *   · Tab 集合 = 今日 / 树洞 / 万能墙 / 食堂 / 跑腿（攻略 / 二手 / 社团已移出）；
 *   · 品牌头与 4 个模块入口常驻所有 Tab；入口点击 push 独立路由，不切 Tab、不新增路由。
 */
import * as React from 'react';
import { Button, ScrollView } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { SquareHome } from '@/features/square/SquareHome';
import { SquareModuleEntries } from '@/features/square/SquareModuleEntries';
import { getSecondaryTabs } from '@/features/navigation/secondaryTabs';

function mockModule(name: string) {
  const React = jest.requireActual<typeof import('react')>('react');
  const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  const { FeatureScreen } = jest.requireActual<typeof import('@/components/ui/FeatureScreen')>('@/components/ui/FeatureScreen');
  return function Module({ embedded = false }: { embedded?: boolean }) {
    const [value, setValue] = React.useState('');
    return <FeatureScreen embedded={embedded} titleKey="screen.square" testID={`module-${name}`}>
      <TextInput testID={`input-${name}`} value={value} onChangeText={setValue} />
    </FeatureScreen>;
  };
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/features/square/TodayPane', () => ({ TodayPane: mockModule('today') }));
jest.mock('@/features/square/CanteenHome', () => ({ CanteenHome: mockModule('canteen') }));
jest.mock('@/features/errand/ErrandScreens', () => ({ ErrandListScreen: mockModule('errand') }));
jest.mock('@/features/campus/CampusScreens', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { CampusFeed: ({ kind }: { kind: string }) => <View testID={`feed-${kind}`} /> };
});

const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockParams: { tab?: string } = {};

beforeEach(() => { mockParams = {}; });
const hidden = { includeHiddenElements: true };
const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 600, x: 0, y: 0 } } });
const scroll = (x: number) => ({ nativeEvent: { contentOffset: { x, y: 0 } } });

describe('首页同页模块 Tab（2026-10-18 集合）', () => {
  it('打开即「今日」：默认 tab 是今日，且二手/攻略/社团不再是 Tab', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    expect(view.getByTestId('top-tab-today').props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId('module-today')).toBeTruthy();
    for (const key of ['market', 'guides', 'clubs']) {
      expect(view.queryByTestId(`top-tab-${key}`)).toBeNull();
    }
  });

  it('Tab 集合与顺序 = 今日 / 树洞 / 万能墙 / 食堂 / 跑腿', () => {
    expect(getSecondaryTabs('square').map((tab) => tab.key)).toEqual([
      'today',
      'confession',
      'wall',
      'canteen',
      'errand',
    ]);
  });

  it.each(['canteen', 'errand'])('点击 %s 显示模块，不新增路由或顶栏', async key => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent.press(view.getByTestId(`top-tab-${key}`));
    expect(view.getByTestId(`module-${key}`)).toBeTruthy();
    expect(view.getByTestId(`top-tab-${key}`).props.accessibilityState.selected).toBe(true);
    expect(view.getAllByTestId('screen-content')).toHaveLength(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSetParams).toHaveBeenLastCalledWith({ tab: key });
    for (const other of ['canteen', 'errand'].filter(item => item !== key)) {
      expect(view.queryByTestId(`module-${other}`, hidden)).toBeNull();
    }
  });

  it('保留树洞、万能墙模块（搜索已改为树洞模块内就地展开）', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent.press(view.getByTestId('top-tab-confession'));
    expect(view.getByTestId('feed-confession')).toBeTruthy();
    expect(view.queryByTestId('square-campus-search')).toBeNull();
    await fireEvent.press(view.getByTestId('top-tab-wall'));
    expect(view.getByTestId('feed-wall')).toBeTruthy();
  });

  it('品牌头常驻，模块入口不再常驻在 Tab 条上方', async () => {
    const home = await renderApp(<SquareHome tabBarHeight={60} />);
    expect(home.getByText('XMUM Dorm')).toBeTruthy();
    expect(home.queryByTestId('square-module-market')).toBeNull();
  });

  it('4 个模块入口（今日内容里，时间轴之下）直达独立路由', async () => {
    const view = await renderApp(<SquareModuleEntries />);
    expect(view.getByTestId('square-module-schedule')).toBeTruthy();
    await fireEvent.press(view.getByTestId('square-module-market'));
    expect(mockPush).toHaveBeenLastCalledWith('/market');
    await fireEvent.press(view.getByTestId('square-module-schedule'));
    expect(mockPush).toHaveBeenLastCalledWith('/tools/timetable');
  });

  it('切换后保留输入，隐藏模块不进入读屏或可见元素树', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent.press(view.getByTestId('top-tab-canteen'));
    await fireEvent.changeText(view.getByTestId('input-canteen'), '保留这个筛选');
    await fireEvent.press(view.getByTestId('top-tab-errand'));
    expect(view.queryByTestId('input-canteen')).toBeNull();
    expect(view.getByTestId('square-pane-canteen', hidden).props.importantForAccessibility).toBe('no-hide-descendants');
    await fireEvent.press(view.getByTestId('top-tab-canteen'));
    expect(view.getByTestId('input-canteen').props.value).toBe('保留这个筛选');
  });

  it('从食堂左滑到跑腿、右滑回食堂，选中态和内容一起更新', async () => {
    mockParams = { tab: 'canteen' };
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(400));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(1200));
    await fireEvent.scroll(view.getByTestId('square-module-pager'), scroll(1400));
    expect(view.getByTestId('module-errand', hidden)).toBeTruthy();
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(1600));
    expect(view.getByTestId('module-errand')).toBeTruthy();
    expect(view.getByTestId('top-tab-errand').props.accessibilityState.selected).toBe(true);
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(1600));
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(1200));
    expect(view.getByTestId('module-canteen')).toBeTruthy();
    expect(mockSetParams.mock.calls).toEqual([[{ tab: 'errand' }], [{ tab: 'canteen' }]]);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('宽度变化后按新宽度分页，边界回弹不会越界', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(400));
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(300));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(0));
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(-50));
    expect(view.getByTestId('module-today')).toBeTruthy();
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(0));
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(300));
    expect(view.getByTestId('top-tab-confession').props.accessibilityState.selected).toBe(true);
  });

  it('点击后的迟到滚动回调不会覆盖刚选中的模块', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(400));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(0));
    await fireEvent.press(view.getByTestId('top-tab-errand'));
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(400));
    expect(view.getByTestId('module-errand')).toBeTruthy();
    expect(view.getByTestId('top-tab-errand').props.accessibilityState.selected).toBe(true);
  });

  it('缓慢拖动松手且没有惯性回调时仍切换到相邻模块', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(400));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(0));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollEndDrag', {
      nativeEvent: { contentOffset: { x: 600, y: 0 }, velocity: { x: 0, y: 0 } },
    });
    expect(view.getByTestId('feed-wall')).toBeTruthy();
    expect(view.getByTestId('top-tab-wall').props.accessibilityState.selected).toBe(true);
  });

  it('初始深链接到跑腿时，测量完成后让选中的 Tab 滚入可见区域', async () => {
    mockParams = { tab: 'errand' };
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('top-tab-errand'), 'layout', {
      nativeEvent: { layout: { x: 620, y: 0, width: 100, height: 48 } },
    });
    expect(scrollTo).toHaveBeenCalledWith({ x: expect.any(Number), animated: false });
    const offset = scrollTo.mock.calls.at(-1)?.[0];
    expect(typeof offset === 'object' && offset?.x).toBeGreaterThan(0);
    expect(typeof offset === 'object' && offset?.x).toBeLessThan(620);
  });

  it('支持首页 tab=wall 深链接；已移除的 tab=market 回落到今日', async () => {
    mockParams = { tab: 'wall' };
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    expect(view.getByTestId('top-tab-wall').props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId('feed-wall')).toBeTruthy();
  });

  it('未知参数（含已移除的 market）回到今日', async () => {
    mockParams = { tab: 'market' };
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    expect(view.getByTestId('top-tab-today').props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId('module-today')).toBeTruthy();
  });

  it('外部参数变化切换模块，未知参数回到今日', async () => {
    function RouteDriver() {
      const [, refresh] = React.useReducer((value: number) => value + 1, 0);
      return <>
        <Button testID="open-wall" title="open wall" onPress={() => { mockParams = { tab: 'wall' }; refresh(); }} />
        <Button testID="open-unknown" title="unknown link" onPress={() => { mockParams = { tab: 'unknown' }; refresh(); }} />
        <SquareHome tabBarHeight={60} />
      </>;
    }
    const view = await renderApp(<RouteDriver />);
    await fireEvent.press(view.getByTestId('open-wall'));
    expect(view.getByTestId('feed-wall')).toBeTruthy();
    await fireEvent.press(view.getByTestId('open-unknown'));
    expect(view.getByTestId('module-today')).toBeTruthy();
  });
});
