import { act, renderHook } from '@testing-library/react-native';
import { useListPagination } from '@/components/ui/ListScreen';
import { SecondaryTabStore, secondaryTabStore, getSecondaryTabs } from '@/features/navigation/secondaryTabs';

const wall = {primaryTab:'campus',secondaryTab:'wall'};
const confession = {primaryTab:'campus',secondaryTab:'confession'};

describe('丙：校园两栏状态复核', () => {
  afterEach(() => secondaryTabStore.clear());
  it('既有校园集合包含两个互斥导航键', () => {
    expect(getSecondaryTabs('campus').map(tab => tab.key)).toEqual(['confession','wall']);
  });
  it('应用单例在两栏独立挂载和返回时恢复位置、筛选及游标', async () => {
    const a = await renderHook(() => useListPagination({scope:wall}));
    await act(() => {
      a.result.current.setFilters({kind:'note'});
      a.result.current.persistScrollOffset(480);
      a.result.current.setCursor('wall-17');
    });
    await a.unmount();
    const b = await renderHook(() => useListPagination({scope:confession}));
    expect(b.result.current.restoredScrollOffset).toBe(0);
    expect(b.result.current.cursor).toBeNull();
    expect(b.result.current.filters).toEqual({});
    await act(() => {
      b.result.current.setFilters({tag:'help'});
      b.result.current.persistScrollOffset(120);
      b.result.current.setCursor('post-29');
    });
    await b.unmount();
    const back = await renderHook(() => useListPagination({scope:wall}));
    expect(back.result.current.restoredScrollOffset).toBe(480);
    expect(back.result.current.filters).toEqual({kind:'note'});
    expect(back.result.current.cursor).toBe('wall-17');
    expect(secondaryTabStore.get('campus','confession')).toEqual({scrollOffset:120,cursor:'post-29',filters:{tag:'help'}});
  });
  it('刷新万能墙不会清除树洞保存的状态', async () => {
    const store=new SecondaryTabStore();
    store.update('campus','confession',{scrollOffset:120,cursor:'post-29',filters:{tag:'help'}});
    const a=await renderHook(() => useListPagination({store,scope:wall}));
    await act(() => {
      a.result.current.dispatch({type:'refresh:start'});
      a.result.current.setCursor('wall-40');
      a.result.current.dispatch({type:'refresh:success',hasMore:false});
    });
    expect(a.result.current.pagination.hasMore).toBe(false);
    expect(store.get('campus','confession')).toEqual({scrollOffset:120,cursor:'post-29',filters:{tag:'help'}});
  });
  it('改变滚动位置不会覆盖当前栏已有的游标和筛选', async () => {
    const store=new SecondaryTabStore();
    store.update('campus','wall',{cursor:'wall-17',filters:{kind:'note'}});
    const a=await renderHook(() => useListPagination({store,scope:wall}));
    await act(() => a.result.current.persistScrollOffset(600));
    expect(store.get('campus','wall')).toEqual({scrollOffset:600,cursor:'wall-17',filters:{kind:'note'}});
  });
  // 两项未通过的公共接缝复现单独保存于丙记录与工作区证据，未改变其期望。
});
