import { useQuery } from '@tanstack/react-query';
import { getTodos } from '@shared/api/todos';

/** 待办接口单页最多 50 条（routes/todos.js）；需要全部待办时最多翻 10 页 = 500 条 */
const TODO_PAGE_SIZE = 50;
const TODO_MAX_PAGES = 10;

export async function fetchAllTodos() {
  const all = [];
  for (let page = 1; page <= TODO_MAX_PAGES; page += 1) {
    const result = await getTodos({ page, pageSize: TODO_PAGE_SIZE });
    const list = Array.isArray(result?.list) ? result.list : [];
    all.push(...list);
    if (!result?.hasMore || list.length === 0) break;
  }
  return all;
}

/**
 * 当前用户的全部待办（含已完成），供「学习日历」和「今天还有 N 项待办」统计使用。
 * 放在 ['todos', ...] 下：待办的增删改都会 invalidate ['todos']，这里随之刷新。
 */
export function useAllTodos(enabled) {
  return useQuery({
    queryKey: ['todos', 'list', { view: 'all-pages' }],
    queryFn: fetchAllTodos,
    enabled,
    staleTime: 30 * 1000,
  });
}
