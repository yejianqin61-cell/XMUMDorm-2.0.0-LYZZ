import * as React from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { TopTabStrip } from '@/components/ui/TopTabStrip';
import { SQUARE_TABS } from '@/features/navigation/secondaryTabs';
import { CampusFeed } from '@/features/campus/CampusScreens';
import { ErrandListScreen } from '@/features/errand/ErrandScreens';
import { CanteenHome } from './CanteenHome';
import { SquareBrandHeader } from './SquareBrandHeader';
import { SquareModuleEntries } from './SquareModuleEntries';
import { TodayPane } from './TodayPane';
import { AgentEntry } from './AgentEntry';
import { SquarePaneScrollScope, type SquarePaneScrollHandle } from './SquarePaneScroll';
import {
  collapseLayout,
  nextCollapseProgress,
  shouldExpandOnOffset,
  shouldExpandOnPull,
} from './squareCollapse';

/**
 * ⚠️ 集合来自 `secondaryTabs.ts` 的**唯一真源**（`SQUARE_TABS`），⛔ 不在这里再写一份。
 * 旧实现把 7 个模块硬编码在本文件里，与注册表的 2 项形成"两份定义"（P0-1）。
 *
 * 2026-10-18 所有者裁决：Tab 集合收敛为「今日 / 树洞 / 万能墙 / 食堂 / 跑腿」；
 * 校园攻略 / 二手 / 社团改由品牌头下方的 4 个模块入口直达独立页面（不再占 Tab）。
 *
 * 2026-10-28 / 阶段4：上部（品牌头 + 四入口 + 校园助手）**随滚动收起**，Tab 条吸顶；
 * 只有回到内容顶部继续下拉才展开（A2-02a/b/c）。收起进度归本文件唯一持有，
 * 内容域只通过 `SquarePaneScroll` 上报数字（见该文件的三条硬规则）。
 */
const TABS = SQUARE_TABS;
type HomeTab = (typeof SQUARE_TABS)[number]['key'];

/** 打开 App（无 `?tab=` 参数）固定落到「今日」（所有者 2026-10-18 指令）。 */
const DEFAULT_TAB: HomeTab = 'today';

function readTab(value: unknown): HomeTab {
  return TABS.find(tab => tab.key === value)?.key ?? DEFAULT_TAB;
}

/** 所有者 2026-10-12 指定：首页模块同页切换，并允许内容横滑。 */
export function SquareHome({ tabBarHeight }: { tabBarHeight: number }): React.ReactElement {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const initialTab = readTab(tab);
  const [routeTab, setRouteTab] = React.useState(initialTab);
  const [selected, setSelected] = React.useState<HomeTab>(initialTab);
  const [visited, setVisited] = React.useState<ReadonlySet<HomeTab>>(() => new Set([initialTab]));
  const [width, setWidth] = React.useState(0);
  const pager = React.useRef<ScrollView>(null);
  const dragging = React.useRef(false);
  const selectedIndex = TABS.findIndex(item => item.key === selected);

  /* ───────────────────── 收起：上部测量 + 各 Tab 进度 ───────────────────── */

  const [headerHeight, setHeaderHeight] = React.useState(0);
  const [progressByTab, setProgressByTab] = React.useState<Record<string, number>>({});
  const headerHeightRef = React.useRef(0);
  const progressRef = React.useRef<Record<string, number>>({});
  const lastOffsetRef = React.useRef<Partial<Record<HomeTab, number>>>({});
  const dragStartRef = React.useRef<Partial<Record<HomeTab, number>>>({});

  const measureHeader = React.useCallback((height: number) => {
    // ⚠️ 内层被固定成测得的高度后还会再报一次 onLayout —— 用容差挡住自我循环
    if (!(height > 0) || Math.abs(height - headerHeightRef.current) < 0.5) return;
    headerHeightRef.current = height;
    setHeaderHeight(height);
  }, []);

  const applyProgress = React.useCallback((tab: HomeTab, next: number) => {
    const current = progressRef.current[tab] ?? 0;
    if (Math.abs(next - current) < 0.001) return;
    progressRef.current = { ...progressRef.current, [tab]: next };
    setProgressByTab(progressRef.current);
  }, []);

  const reportOffset = React.useCallback(
    (tab: HomeTab, offsetY: number) => {
      const header = headerHeightRef.current;
      if (!(header > 0)) return;
      const last = lastOffsetRef.current[tab] ?? 0;
      lastOffsetRef.current[tab] = offsetY;
      // iOS 回弹到负值 = 已在回顶下拉 → 直接展开（安卓走 endDrag 判定）
      if (shouldExpandOnOffset(offsetY)) {
        applyProgress(tab, 0);
        return;
      }
      applyProgress(
        tab,
        nextCollapseProgress({
          current: progressRef.current[tab] ?? 0,
          offsetY,
          headerHeight: header,
          movingDown: offsetY > last,
        })
      );
    },
    [applyProgress]
  );

  const beginDrag = React.useCallback((tab: HomeTab) => {
    dragStartRef.current[tab] = lastOffsetRef.current[tab] ?? 0;
  }, []);

  const endDrag = React.useCallback(
    (tab: HomeTab, offsetY: number) => {
      const beginOffsetY = dragStartRef.current[tab] ?? 0;
      delete dragStartRef.current[tab];
      lastOffsetRef.current[tab] = offsetY;
      if (
        shouldExpandOnPull({
          beginOffsetY,
          endOffsetY: offsetY,
          collapsed: (progressRef.current[tab] ?? 0) >= 1,
        })
      ) {
        applyProgress(tab, 0);
      }
    },
    [applyProgress]
  );

  /**
   * 句柄必须**稳定**：内容 pane 里的 `ListScreen` 是 Context 消费者，
   * 每帧新建句柄会让它跟着重渲染。只有"某个 Tab 的收起状态跨过 1"时才重建。
   */
  const collapsedSignature = TABS.map(tab =>
    (progressByTab[tab.key] ?? 0) >= 1 ? '1' : '0'
  ).join('');
  const paneHandles = React.useMemo(() => {
    const build = (key: HomeTab): SquarePaneScrollHandle => ({
      tab: key,
      collapsed: (progressRef.current[key] ?? 0) >= 1,
      reportOffset: offsetY => reportOffset(key, offsetY),
      beginDrag: () => beginDrag(key),
      endDrag: offsetY => endDrag(key, offsetY),
    });
    return Object.fromEntries(
      TABS.map(tab => [tab.key, build(tab.key)])
    ) as Record<HomeTab, SquarePaneScrollHandle>;
    // collapsedSignature 是"哪些 Tab 已收起"的压缩表达，也就是这里唯一要跟的量
  }, [collapsedSignature, reportOffset, beginDrag, endDrag]);

  /* ───────────────────────────── 二级 Tab / 横滑 ───────────────────────────── */

  const remember = React.useCallback((keys: readonly HomeTab[]) => {
    setVisited(current => keys.every(key => current.has(key)) ? current : new Set([...current, ...keys]));
  }, []);

  // 外部深链接改变时同步选中项，在渲染子模块前完成，避免显示上一模块一帧。
  if (routeTab !== initialTab) {
    setRouteTab(initialTab);
    remember([initialTab]);
    setSelected(initialTab);
  }
  React.useEffect(() => { dragging.current = false; }, [initialTab]);

  const alignPage = React.useCallback(() => {
    if (width > 0 && !dragging.current) {
      // 点击直接切换，避免跨多个模块的整页动画；原生分页处理用户横滑。
      pager.current?.scrollTo({ x: selectedIndex * width, animated: false });
    }
  }, [selectedIndex, width]);
  React.useEffect(alignPage, [alignPage]);

  const select = (key: HomeTab) => {
    remember([key]);
    setSelected(key);
    if (key !== selected) router.setParams({ tab: key });
  };
  const finishSwipe = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!dragging.current || width <= 0) return;
    dragging.current = false;
    const index = Math.max(0, Math.min(TABS.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
    select(TABS[index].key);
    pager.current?.scrollTo({ x: index * width, animated: false });
  };

  /* ───────────────────────────── 渲染 ───────────────────────────── */

  // 收起进度按**当前 Tab 自己**的位置算（切 Tab 后不沿用上一个 Tab 的值）
  const progress = progressByTab[selected] ?? 0;
  const { height: upperHeight, translateY: upperTranslateY } = collapseLayout({
    progress,
    headerHeight,
  });
  const measured = headerHeight > 0;

  return (
    <Screen
      testID="screen-square"
      header={
        <>
          {/* 可收起上部：外层裁剪高度，内层按自身高度上移（品牌头先离开） */}
          <View
            testID="square-upper"
            style={measured ? { height: upperHeight, overflow: 'hidden' } : undefined}
          >
            <View
              testID="square-upper-content"
              onLayout={event => measureHeader(event.nativeEvent.layout.height)}
              style={measured ? { height: headerHeight, transform: [{ translateY: upperTranslateY }] } : undefined}
            >
              <SquareBrandHeader />
              <SquareModuleEntries />
              <AgentEntry />
            </View>
          </View>
          {/* 吸顶：容器（Screen header）已施加顶部 inset，Tab 条不越过安全区 */}
          <TopTabStrip testID="square-module-tabs" tabs={TABS} selectedKey={selected} onSelect={key => {
            dragging.current = false;
            select(readTab(key));
          }} />
        </>
      }
      bottomMode="tabbar"
      tabBarHeight={tabBarHeight}
    >
      <View testID="square-module-viewport" style={{ flex: 1, minHeight: 0 }} onLayout={event => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0) {
          dragging.current = false;
          setWidth(nextWidth);
        }
      }}>
        <ScrollView
          ref={pager}
          testID="square-module-pager"
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={width > 0}
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'stretch' }}
          onContentSizeChange={alignPage}
          onScrollBeginDrag={() => { dragging.current = true; }}
          onScroll={event => {
            if (!dragging.current || width <= 0) return;
            const position = event.nativeEvent.contentOffset.x / width;
            const keys = [Math.floor(position), Math.ceil(position)]
              .filter(index => index >= 0 && index < TABS.length)
              .map(index => TABS[index].key);
            // 手指拖到邻页时加载它，避免松手后才出现内容；其余模块仍按需加载。
            remember(keys);
          }}
          scrollEventThrottle={16}
          onScrollEndDrag={event => {
            if (event.nativeEvent.velocity?.x === 0) finishSwipe(event);
          }}
          onMomentumScrollEnd={finishSwipe}
        >
          {TABS.map(item => (
            <View
              key={item.key}
              testID={`square-pane-${item.key}`}
              style={{ width, flexShrink: 0, minHeight: 0 }}
              accessibilityElementsHidden={item.key !== selected}
              importantForAccessibility={item.key === selected ? 'auto' : 'no-hide-descendants'}
            >
              {visited.has(item.key) ? (
                <SquarePaneScrollScope handle={paneHandles[item.key]}>
                  <ModuleContent tab={item.key} />
                </SquarePaneScrollScope>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

/**
 * ⚠️ 必须 `memo`：广场壳每帧都在更新收起进度，未 memo 时 5 个 pane 会跟着重渲染
 * （列表、图片、输入状态全部白算）——收敛后只有"内容真的变了"才重渲染。
 */
const ModuleContent = React.memo(function ModuleContent({
  tab,
}: {
  tab: HomeTab;
}): React.ReactElement {
  switch (tab) {
    case 'today': return <TodayPane />;
    case 'canteen': return <CanteenHome embedded />;
    case 'errand': return <ErrandListScreen embedded />;
    // 树洞 / 万能墙：模块入口统一由 `CampusFeed` 决定（⛔ 不再有第二个搜索入口/发布入口）
    default: return <CampusFeed kind={tab} />;
  }
});
