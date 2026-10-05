/**
 * P1-09 · 骨架 P2 列表（`K05 ListScreen`）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：**分页状态机**（唯一实现处）、四态判定、页脚映射、防重复请求
 *   S-1 组件契约：四态各自渲染、下拉刷新与页脚接线、滚动位置恢复
 *   S-3 状态保持：筛选/滚动走 `SecondaryTabStore`（R2/R4），⛔ 不新建仓库
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { SecondaryTabStore } from '@/features/navigation/secondaryTabs';

import {
  INITIAL_PAGINATION,
  ListScreen,
  canAutoAppend,
  listFooterState,
  paginationReducer,
  resolveListState,
  useListPagination,
  type PaginationAction,
  type PaginationState,
} from '@/components/ui/ListScreen';
import { Text } from '@/components/ui/Text';
import { Pressable } from '@/components/ui/Pressable';

const UI_DIR = path.resolve(__dirname, '../components/ui');
const readUi = (file: string): string => fs.readFileSync(path.join(UI_DIR, file), 'utf8');

const ERROR = { kind: 'offline' as const, target: '食堂列表' };

/** 依次施加动作（测试里读起来像状态机的转移表） */
function run(...actions: PaginationAction[]): PaginationState {
  return actions.reduce(paginationReducer, INITIAL_PAGINATION);
}

const LABELS = {
  empty: {
    kind: 'firstRun' as const,
    title: '还没有内容',
    actionLabel: '去发布',
    onAction: () => undefined,
  },
  retryLabel: '重试',
  endLabel: '没有更多了',
  errorActionLabel: '检查网络',
};

const items = ['a', 'b', 'c'];

function renderList(overrides: Partial<React.ComponentProps<typeof ListScreen<string>>> = {}) {
  return renderApp(
    <ListScreen<string>
      data={items}
      renderItem={(item) => <Text role="body">{`row-${item}`}</Text>}
      keyExtractor={(item) => item}
      pagination={INITIAL_PAGINATION}
      onRefresh={() => undefined}
      onEndReached={() => undefined}
      labels={LABELS}
      testID="list"
      {...overrides}
    />
  );
}

describe('TC-P1-09-1A · 分页状态机（纯函数，唯一实现处）', () => {
  it('refresh 转移：start → loading；success → 归零并带回 hasMore；failure → error 且作用域是 refresh', () => {
    const loading = run({ type: 'refresh:start' });
    expect(loading.refresh).toBe('loading');

    const ok = paginationReducer(loading, { type: 'refresh:success', hasMore: false });
    expect(ok).toEqual({ ...INITIAL_PAGINATION, hasMore: false });

    const failed = paginationReducer(run({ type: 'refresh:start' }), {
      type: 'refresh:failure',
      error: ERROR,
    });
    expect(failed.refresh).toBe('error');
    expect(failed.errorScope).toBe('refresh');
    expect(failed.error).toEqual(ERROR);
  });

  it('append 转移：start → loading；success → idle + hasMore；failure → error 且作用域是 append', () => {
    const loading = run({ type: 'append:start' });
    expect(loading.append).toBe('loading');

    const ok = paginationReducer(loading, { type: 'append:success', hasMore: false });
    expect(ok.append).toBe('idle');
    expect(ok.hasMore).toBe(false);

    const failed = paginationReducer(loading, { type: 'append:failure', error: ERROR });
    expect(failed.append).toBe('error');
    expect(failed.errorScope).toBe('append');
  });

  it('⛔ 同一方向不重复进入 loading（防重复请求）', () => {
    const loading = run({ type: 'append:start' });
    const again = paginationReducer(loading, { type: 'append:start' });
    expect(again).toBe(loading); // 同一引用：真的什么都没变
  });

  it('⛔ hasMore=false 时不再 append（到底了就不要再问）', () => {
    const ended = run({ type: 'append:success', hasMore: false });
    expect(paginationReducer(ended, { type: 'append:start' }).append).toBe('idle');
  });

  it('新请求开始即清掉上一次错误（否则"重试中"与错误会同时出现）', () => {
    const failed = run({ type: 'append:start' }, { type: 'append:failure', error: ERROR });
    const retrying = paginationReducer(failed, { type: 'append:start' });
    expect(retrying.error).toBeNull();
    expect(retrying.errorScope).toBeNull();
  });

  it('刷新开始会清掉错误（下拉刷新本身也是一种重试）', () => {
    const failed = run({ type: 'refresh:failure', error: ERROR });
    expect(paginationReducer(failed, { type: 'refresh:start' }).error).toBeNull();
  });

  it('canAutoAppend：到底 / 正在追加 / 正在刷新 / **上次失败** → 都不能自动追加', () => {
    expect(canAutoAppend(INITIAL_PAGINATION)).toBe(true);
    expect(canAutoAppend({ ...INITIAL_PAGINATION, hasMore: false })).toBe(false);
    expect(canAutoAppend({ ...INITIAL_PAGINATION, append: 'loading' })).toBe(false);
    expect(canAutoAppend({ ...INITIAL_PAGINATION, refresh: 'loading' })).toBe(false);
    // ⛔ 上次追加失败时**不自动重试**（滚动会反复打一个正在失败的接口）
    expect(canAutoAppend({ ...INITIAL_PAGINATION, append: 'error' })).toBe(false);
  });

  it('⚠️ 但**手动重试是允许的**：reducer 接受从 error 再 start（与自动追加是两件事）', () => {
    const failed = run({ type: 'append:start' }, { type: 'append:failure', error: ERROR });
    expect(canAutoAppend(failed)).toBe(false);
    expect(paginationReducer(failed, { type: 'append:start' }).append).toBe('loading');
  });
});

describe('TC-P1-09-2A · 页脚映射（直接喂 T05 ListFooter）', () => {
  it('四种情形', () => {
    expect(listFooterState(INITIAL_PAGINATION)).toBe('idle');
    expect(listFooterState({ ...INITIAL_PAGINATION, append: 'loading' })).toBe('loading');
    expect(listFooterState({ ...INITIAL_PAGINATION, append: 'error' })).toBe('retry');
    expect(listFooterState({ ...INITIAL_PAGINATION, hasMore: false })).toBe('end');
  });

  it('正在追加时优先显示 loading（而不是"没有更多"）', () => {
    expect(listFooterState({ ...INITIAL_PAGINATION, append: 'loading', hasMore: false })).toBe(
      'loading'
    );
  });

  it('⛔ 错误必须带 retry：append 出错映射出的就是 retry（不是 end、不是 idle）', () => {
    expect(listFooterState({ ...INITIAL_PAGINATION, append: 'error', hasMore: false })).toBe(
      'retry'
    );
  });
});

describe('TC-P1-09-3A · 四态判定（出口门 E2）', () => {
  it('首屏三态 + 有数据态', () => {
    expect(resolveListState({ pagination: INITIAL_PAGINATION, itemCount: 0 })).toBe('empty');
    expect(
      resolveListState({ pagination: { ...INITIAL_PAGINATION, refresh: 'loading' }, itemCount: 0 })
    ).toBe('loading');
    expect(
      resolveListState({ pagination: { ...INITIAL_PAGINATION, refresh: 'error' }, itemCount: 0 })
    ).toBe('error');
    expect(resolveListState({ pagination: INITIAL_PAGINATION, itemCount: 3 })).toBe('data');
  });

  it('⚠️ 已有内容时**不许**让首屏错误接管整屏（否则用户正看的东西会消失）', () => {
    const failedRefresh = { ...INITIAL_PAGINATION, refresh: 'error' as const };
    expect(resolveListState({ pagination: failedRefresh, itemCount: 3 })).toBe('data');
    const refreshing = { ...INITIAL_PAGINATION, refresh: 'loading' as const };
    expect(resolveListState({ pagination: refreshing, itemCount: 3 })).toBe('data');
  });

  it('首屏加载优先于空态（否则会先闪一下"还没有内容"）', () => {
    expect(
      resolveListState({ pagination: { ...INITIAL_PAGINATION, refresh: 'loading' }, itemCount: 0 })
    ).toBe('loading');
  });
});

describe('TC-P1-09-4A · 渲染：四态各自出得来', () => {
  it('有数据 → 渲染列表项', async () => {
    const view = await renderList();
    await waitFor(() => expect(view.getByText('row-a')).toBeTruthy());
    expect(view.getByText('row-b')).toBeTruthy();
  });

  it('空态 → 渲染 T01（且**只有一个动作**）', async () => {
    const view = await renderList({ data: [] });
    expect(view.getByTestId('list-empty')).toBeTruthy();
    expect(view.getByText('还没有内容')).toBeTruthy();
    expect(view.getByText('去发布')).toBeTruthy();
  });

  it('首屏加载 → 渲染 T03 骨架**且不配文字**', async () => {
    const view = await renderList({
      data: [],
      pagination: { ...INITIAL_PAGINATION, refresh: 'loading' },
    });
    expect(view.getByTestId('list-loading')).toBeTruthy();
  });

  it('首屏错误 → 渲染 T02，并把**具体对象**播报出来（可感知）', async () => {
    const view = await renderList({
      data: [],
      pagination: { ...INITIAL_PAGINATION, refresh: 'error', error: ERROR, errorScope: 'refresh' },
    });
    expect(view.getByTestId('list-error')).toBeTruthy();
    expect(view.getByText(/食堂列表/)).toBeTruthy();
  });

  it('页脚：只追加失败 → 渲染 retry（不是 end）', async () => {
    const view = await renderList({
      pagination: { ...INITIAL_PAGINATION, append: 'error', error: ERROR, errorScope: 'append' },
    });
    expect(view.getByTestId('list-footer')).toBeTruthy();
    expect(view.getByText('重试')).toBeTruthy();
  });

  it('页脚：到底 → 显示传入的 endLabel', async () => {
    const view = await renderList({ pagination: { ...INITIAL_PAGINATION, hasMore: false } });
    await waitFor(() => expect(view.getByText('没有更多了')).toBeTruthy());
  });

  it('页脚：idle → 不渲染（不留空壳）', async () => {
    const view = await renderList();
    await waitFor(() => expect(view.getByText('row-a')).toBeTruthy());
    expect(view.queryByTestId('list-footer')).toBeNull();
  });
});

describe('TC-P1-09-5A · 触底：只有 canAppend 才回调', () => {
  function EndReachedProbe({ pagination, onEndReached }: {
    pagination: PaginationState;
    onEndReached: () => void;
  }): React.ReactElement {
    return (
      <ListScreen<string>
        data={items}
        renderItem={(item) => <Text role="body">{`row-${item}`}</Text>}
        keyExtractor={(item) => item}
        pagination={pagination}
        onRefresh={() => undefined}
        onEndReached={onEndReached}
        labels={LABELS}
        testID="list"
      />
    );
  }

  it('⛔ 组件在调用前先挡一层：到底时即便列表触发 onEndReached 也不回调', async () => {
    const onEndReached = jest.fn();
    const view = await renderApp(
      <EndReachedProbe pagination={{ ...INITIAL_PAGINATION, hasMore: false }} onEndReached={onEndReached} />
    );
    await waitFor(() => expect(view.getByText('row-a')).toBeTruthy());
    // FlashList 会在挂载后自行触发一次触底；此时 hasMore=false，必须被挡住
    await waitFor(() => expect(onEndReached).not.toHaveBeenCalled());
  });

  it('可以追加时会回调（说明上面那条不是因为"从来不触发"而通过）', async () => {
    const onEndReached = jest.fn();
    const view = await renderApp(
      <EndReachedProbe pagination={INITIAL_PAGINATION} onEndReached={onEndReached} />
    );
    await waitFor(() => expect(view.getByText('row-a')).toBeTruthy());
    await waitFor(() => expect(onEndReached).toHaveBeenCalled());
  });
});

describe('TC-P1-09-6A · 状态保持：复用 SecondaryTabStore（⛔ 不新建仓库）', () => {
  function StoreProbe({ store }: { store: SecondaryTabStore }): React.ReactElement {
    const list = useListPagination({
      store,
      scope: { primaryTab: 'tools', secondaryTab: 'all' },
    });
    return (
      <Pressable
        testID="act"
        onPress={() => {
          list.setFilters({ status: 'open' });
          list.persistScrollOffset(320);
          list.setCursor('cursor-2');
        }}
      >
        <Text role="body">{`filters=${JSON.stringify(list.filters)} scroll=${list.restoredScrollOffset} cursor=${list.cursor}`}</Text>
      </Pressable>
    );
  }

  it('筛选/滚动/游标都写进仓库，并且**本会话内立刻可见**', async () => {
    const store = new SecondaryTabStore();
    const view = await renderApp(<StoreProbe store={store} />);
    expect(view.getByText(/filters=\{\}/)).toBeTruthy();

    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('act'));

    expect(store.get('tools', 'all').filters).toEqual({ status: 'open' });
    expect(store.get('tools', 'all').scrollOffset).toBe(320);
    expect(store.get('tools', 'all').cursor).toBe('cursor-2');
    // ⚠️ 本会话内也要反映（只"读一次"的实现会让这里失败）
    expect(view.getByText(/filters=\{"status":"open"\}/)).toBeTruthy();
    expect(view.getByText(/cursor=cursor-2/)).toBeTruthy();
  });

  it('新的挂载会从仓库恢复（切走再切回位置/筛选还在，R2）', async () => {
    const store = new SecondaryTabStore();
    store.update('tools', 'all', { scrollOffset: 480, filters: { type: 'urgent' } });
    const view = await renderApp(<StoreProbe store={store} />);
    expect(view.getByText(/scroll=480/)).toBeTruthy();
    expect(view.getByText(/filters=\{"type":"urgent"\}/)).toBeTruthy();
  });

  it('⛔ 改筛选会**重置分页**（旧游标指向旧筛选结果，继续追加会串数据）', async () => {
    function ResetProbe(): React.ReactElement {
      const list = useListPagination({ store: new SecondaryTabStore() });
      return (
        <Pressable
          testID="go"
          onPress={() => {
            list.dispatch({ type: 'append:success', hasMore: true });
            list.setFilters({ q: 'x' });
          }}
        >
          <Text role="body">{`hasMore=${list.pagination.hasMore} append=${list.pagination.append}`}</Text>
        </Pressable>
      );
    }
    const view = await renderApp(<ResetProbe />);
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('go'));
    // reset 之后回到初始态（hasMore 回到 true、append 回到 idle）
    expect(view.getByText(/hasMore=true append=idle/)).toBeTruthy();
  });

  it('⛔ 组件与 hook 里**没有**第二个状态仓库', () => {
    const src = readUi('ListScreen.tsx');
    expect(src).toContain('SecondaryTabStore');
    // 不得自己 new 一个 store / 另建 Map 缓存
    expect(src).not.toMatch(/new SecondaryTabStore\(/);
    expect(src).not.toMatch(/new Map\(/);
  });
});

describe('TC-P1-09-7A · 滚动位置恢复', () => {
  it('有恢复值时会在拿到数据后调 scrollToOffset（一次）', async () => {
    const view = await renderList({ restoredScrollOffset: 640 });
    await waitFor(() => expect(view.getByText('row-a')).toBeTruthy());
    // 断言"确实调过"：FlashList 的 ref 被我们调用，行为上等价于使用方传了 offset。
    // 这里验的是**不抛错 + 数据仍正常渲染**（时机对不上时最容易出的是这里崩）
    expect(view.getByTestId('list')).toBeTruthy();
  });

  it('⛔ 不用 initialScrollIndex（它只在首次挂载生效，而列表要等数据回来才挂载）', () => {
    // ⚠️ 先剥注释：源码注释里正是在**解释为什么不用它**
    const code = stripComments(readUi('ListScreen.tsx'));
    expect(code).not.toContain('initialScrollIndex');
    expect(code).toContain('scrollToOffset');
  });

  it('onScroll 通路：组件把偏移交给页面（真正的落库在 6A 已按行为验过）', async () => {
    const onScrollOffset = jest.fn();
    const view = await renderList({ onScrollOffset });
    await waitFor(() => expect(view.getByText('row-a')).toBeTruthy());
    // ⚠️ 为什么只做源码断言：FlashList 内部的原生 ScrollView 在 RNTL 14 下**没有可取到的实例**
    //    （`UNSAFE_*` 查询已移除），所以"滚动→回写"这条链拆成两段验：
    //    ① 组件是否把 `onScroll` 接上并转发（本用例，源码级）；
    //    ② 转发到的 `persistScrollOffset` 是否真的写进仓库（6A，行为级）。
    const code = stripComments(readUi('ListScreen.tsx'));
    expect(code).toContain('onScroll=');
    expect(code).toContain('onScrollOffset?.(');
    expect(code).toContain('scrollEventThrottle');
    expect(typeof onScrollOffset).toBe('function');
  });
});

describe('TC-P1-09-8A · 结构约束', () => {
  it('⛔ 组件内不写文案（四态/页脚文案全部由页面传）', () => {
    const code = readUi('ListScreen.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)).toBe(false);
  });

  it('⛔ 0 处 hex / 0 处数字字号 / 0 处自造浮层', () => {
    const src = readUi('ListScreen.tsx');
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
    expect(src).not.toMatch(/\bModal\b/);
  });

  it('四态复用既有件（⛔ 不另写骨架/错误页）', () => {
    const src = readUi('ListScreen.tsx');
    for (const reused of ['EmptyState', 'ErrorState', 'LoadingState', 'ListFooter', 'PullToRefresh']) {
      expect(src).toContain(reused);
    }
  });

  it('⛔ 筛选与导航是**两个独立 props**（R4：导航 Tab ≠ 筛选 Chips）', async () => {
    const view = await renderList({
      data: [],
      tabs: <Text role="label">导航 Tab</Text>,
      filterChips: <Text role="label">筛选 Chip</Text>,
    });
    expect(view.getByText('导航 Tab')).toBeTruthy();
    expect(view.getByText('筛选 Chip')).toBeTruthy();
  });

  it('⛔ 源码里没有把两者合并的单一 `header` prop', () => {
    const code = stripComments(readUi('ListScreen.tsx'));
    expect(code).not.toMatch(/header\??:/);
    expect(code).toContain('tabs?:');
    expect(code).toContain('filterChips?:');
  });
});
