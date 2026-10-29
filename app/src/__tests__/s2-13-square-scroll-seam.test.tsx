/**
 * 阶段4-02 · 广场滚动上报接缝（SquarePaneScroll）
 *
 * 契约要点：pane 只上报数字（offset / 拖拽起止），广场壳自己算收起进度；
 * ⛔ 没有 Provider 时 ListScreen 行为必须与今天逐字节一致（26 个页面在用）。
 */
import * as React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { INITIAL_PAGINATION, ListScreen } from '@/components/ui/ListScreen';
import {
  SquarePaneScrollScope,
  type SquarePaneScrollHandle,
} from '@/features/square/SquarePaneScroll';

type Row = { id: number };
const rows: Row[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
const labels = {
  empty: { kind: 'firstRun' as const, title: '空', actionLabel: '刷新', onAction: () => {} },
};

function makeHandle(overrides: Partial<SquarePaneScrollHandle> = {}): SquarePaneScrollHandle {
  return {
    tab: 'errand',
    collapsed: false,
    reportOffset: jest.fn(),
    beginDrag: jest.fn(),
    endDrag: jest.fn(),
    ...overrides,
  };
}

function renderList(options: {
  testID: string;
  onScrollOffset?: (offset: number) => void;
  handle?: SquarePaneScrollHandle;
}): React.ReactElement {
  const list = (
    <ListScreen<Row>
      testID={options.testID}
      data={rows}
      keyExtractor={row => String(row.id)}
      renderItem={row => <Text testID={`${options.testID}-row-${row.id}`}>{`行 ${row.id}`}</Text>}
      pagination={{ ...INITIAL_PAGINATION, hasMore: false }}
      onRefresh={() => {}}
      onEndReached={() => {}}
      labels={labels}
      onScrollOffset={options.onScrollOffset}
    />
  );
  return options.handle ? (
    <SquarePaneScrollScope handle={options.handle}>{list}</SquarePaneScrollScope>
  ) : (
    list
  );
}

const scrollEvent = (y: number) => ({ nativeEvent: { contentOffset: { x: 0, y } } });

describe('广场滚动上报接缝', () => {
  it('没有 Provider 时行为不变：onScrollOffset 照旧收到滚动位置', async () => {
    const onScrollOffset = jest.fn();
    const view = await renderApp(renderList({ testID: 'plain', onScrollOffset }));
    await fireEvent.scroll(view.getByTestId('plain-scroll'), scrollEvent(240));
    expect(onScrollOffset).toHaveBeenCalledWith(240);
  });

  it('有 Provider 时把滚动位置报给所属 pane', async () => {
    const reportOffset = jest.fn();
    const view = await renderApp(
      renderList({ testID: 'wired', handle: makeHandle({ reportOffset }) })
    );
    await fireEvent.scroll(view.getByTestId('wired-scroll'), scrollEvent(240));
    expect(reportOffset).toHaveBeenCalledWith(240);
  });

  it('拖拽起止也上报，展开判定才拿得到手势边界', async () => {
    const beginDrag = jest.fn();
    const endDrag = jest.fn();
    const view = await renderApp(
      renderList({ testID: 'drag', handle: makeHandle({ beginDrag, endDrag }) })
    );
    await fireEvent(view.getByTestId('drag-scroll'), 'scrollBeginDrag', scrollEvent(0));
    await fireEvent(view.getByTestId('drag-scroll'), 'scrollEndDrag', scrollEvent(0));
    expect(beginDrag).toHaveBeenCalledTimes(1);
    expect(endDrag).toHaveBeenCalledWith(0);
  });

  it('未收起时保留下拉刷新', async () => {
    const view = await renderApp(renderList({ testID: 'expanded', handle: makeHandle() }));
    expect(view.getByTestId('expanded-scroll').props.refreshControl).toBeTruthy();
  });

  it('上部已收起时让出下拉刷新（先展开、再下拉才是刷新）', async () => {
    const view = await renderApp(
      renderList({ testID: 'collapsed', handle: makeHandle({ collapsed: true }) })
    );
    expect(view.getByTestId('collapsed-scroll').props.refreshControl).toBeFalsy();
  });

  it('两个 pane 各报各的，不串台', async () => {
    const left = makeHandle({ tab: 'errand' });
    const right = makeHandle({ tab: 'canteen' });
    const view = await renderApp(
      <>
        {renderList({ testID: 'left', handle: left })}
        {renderList({ testID: 'right', handle: right })}
      </>
    );
    await fireEvent.scroll(view.getByTestId('right-scroll'), scrollEvent(320));
    expect(right.reportOffset).toHaveBeenCalledWith(320);
    expect(left.reportOffset).not.toHaveBeenCalled();
  });
});
