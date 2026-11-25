import {
  chatDayKey,
  chatDayLabel,
  isReadByPeer,
  itemStatusLabel,
  mergeChatPages,
  olderCursor,
  sumUnread,
} from '../../shared/utils/marketplaceChat';

const m = (id, created_at) => ({ id, created_at });

describe('mergeChatPages', () => {
  it('更早页在前、最新页在后，按时间升序且去重', () => {
    const latest = [m(5, '2026-11-16T10:05:00Z'), m(6, '2026-11-16T10:06:00Z')];
    const older = [
      { list: [m(3, '2026-11-16T10:03:00Z'), m(4, '2026-11-16T10:04:00Z'), m(5, '2026-11-16T10:05:00Z')] },
      { list: [m(1, '2026-11-16T10:01:00Z'), m(2, '2026-11-16T10:02:00Z')] },
    ];
    expect(mergeChatPages(older, latest).map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('同一秒的消息按 id 排', () => {
    const list = [m(9, '2026-11-16T10:00:00Z'), m(8, '2026-11-16T10:00:00Z')];
    expect(mergeChatPages([], list).map((x) => x.id)).toEqual([8, 9]);
  });

  it('空输入不报错', () => {
    expect(mergeChatPages(undefined, undefined)).toEqual([]);
  });
});

describe('olderCursor', () => {
  it('还没加载更早页时用最新页的游标；加载过就用最后一页的', () => {
    expect(olderCursor([], { hasMore: true, nextCursor: 'a' })).toBe('a');
    expect(olderCursor([{ hasMore: true, nextCursor: 'b' }], { hasMore: true, nextCursor: 'a' })).toBe('b');
    expect(olderCursor([{ hasMore: false, nextCursor: null }], { hasMore: true, nextCursor: 'a' })).toBeNull();
    expect(olderCursor([], null)).toBeNull();
  });
});

describe('isReadByPeer', () => {
  it('对方已读时间不早于发送时间才算已读', () => {
    expect(isReadByPeer(m(1, '2026-11-16T10:00:00Z'), '2026-11-16T10:00:00Z')).toBe(true);
    expect(isReadByPeer(m(1, '2026-11-16T10:00:01Z'), '2026-11-16T10:00:00Z')).toBe(false);
    expect(isReadByPeer(m(1, '2026-11-16T10:00:00Z'), null)).toBe(false);
  });
});

describe('日期分隔条', () => {
  const now = new Date(2026, 10, 16, 12, 0, 0);
  it('今天 / 昨天 / 具体日期', () => {
    expect(chatDayLabel(new Date(2026, 10, 16, 8), true, now)).toBe('今天');
    expect(chatDayLabel(new Date(2026, 10, 15, 23), true, now)).toBe('昨天');
    expect(chatDayLabel(new Date(2026, 9, 3), true, now)).toBe('10月3日');
    expect(chatDayLabel(new Date(2025, 9, 3), true, now)).toBe('2025年10月3日');
    expect(chatDayLabel(new Date(2026, 10, 16, 8), false, now)).toBe('Today');
  });
  it('非法时间返回空', () => {
    expect(chatDayKey('nope')).toBe('');
    expect(chatDayLabel(null, true, now)).toBe('');
  });
});

describe('杂项', () => {
  it('sumUnread 累加，忽略非法值', () => {
    expect(sumUnread([{ unread_count: 2 }, { unread_count: '3' }, { unread_count: null }, null])).toBe(5);
  });
  it('itemStatusLabel 三种状态', () => {
    expect(itemStatusLabel('on_sale', true)).toBe('在售');
    expect(itemStatusLabel('reserved', true)).toBe('已预订');
    expect(itemStatusLabel('sold', false)).toBe('Sold');
  });
});
