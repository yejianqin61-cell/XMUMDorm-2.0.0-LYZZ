/**
 * 阶段B-03 · 会话列表第二页（游标页读取纯函数）
 *
 * 列表组件本身的分页状态机由 `K05` 负责；这里钉住"服务端给的游标/hasMore 怎么读"，
 * 以及"没有游标就必须停下来"。
 */
import { readThreadPage } from '@/features/mailbox/conversations';

const row = (threadId: number) => ({
  thread_id: threadId,
  item: { id: threadId, title: `商品${threadId}`, available: true },
  role: 'buyer',
  peer: { id: 1, name: '对方', avatar: null },
  last_message_at: '2026-10-30T10:00:00.000Z',
  last_content: '你好',
  unread_count: 0,
});

describe('会话列表游标页（阶段B-03）', () => {
  it('服务端给了游标与 hasMore：原样给出行、游标、hasMore', () => {
    const page = readThreadPage({ list: [row(11), row(12)], hasMore: true, nextCursor: 'c2' });
    expect(page.rows.map(r => r.thread_id)).toEqual([11, 12]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('c2');
  });

  it('没有游标：hasMore 为假，客户端必须停止请求', () => {
    const page = readThreadPage({ list: [row(11)], hasMore: true, nextCursor: null });
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('空页/异常形状：安全返回空列表，不抛错', () => {
    expect(readThreadPage(null).rows).toEqual([]);
    expect(readThreadPage({ list: 'nope' }).hasMore).toBe(false);
  });

  it('行形状不合法（缺 thread_id）整行丢掉', () => {
    const page = readThreadPage({ list: [{ thread_id: 0 }, row(13)] });
    expect(page.rows.map(r => r.thread_id)).toEqual([13]);
  });
});
