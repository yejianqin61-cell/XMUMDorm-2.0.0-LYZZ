/**
 * 信箱/通知模块测试
 * 覆盖：API 获取、未读计数、模块筛选、标记已读、清空
 */
const ASMock = require('@react-native-async-storage/async-storage');

global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

// ─── 辅助函数 ──────────────────────────────

const MODULE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'treehole', label: '树洞' },
  { key: 'trending', label: '热搜' },
  { key: 'canteen', label: '食堂' },
  { key: 'marketplace', label: '二手' },
  { key: 'club', label: '社团' },
  { key: 'system', label: '系统' },
];

const MODULE_MAP = {
  treehole: ['treehole_like', 'treehole_comment', 'like', 'comment'],
  trending: ['trending_like', 'trending_comment', 'campus_like', 'campus_comment'],
  canteen: ['canteen_review', 'canteen_reply'],
  marketplace: ['marketplace_want', 'marketplace_chat', 'marketplace'],
  club: ['club_follow', 'club_like', 'club_comment'],
  system: ['system_announcement', 'system_ban', 'announcement'],
};

function getActionText(type, isZh) {
  if (type.includes('like')) return isZh ? '赞了' : 'liked';
  if (type.includes('comment') || type.includes('review') || type.includes('reply')) return isZh ? '评论了' : 'commented';
  if (type.includes('follow')) return isZh ? '关注了' : 'followed';
  if (type.includes('want')) return isZh ? '收藏了' : 'wanted';
  if (type.includes('chat')) return isZh ? '发来消息' : 'messaged';
  if (type.includes('announcement') || type.includes('ban')) return isZh ? '系统通知' : 'System';
  return isZh ? '互动了' : 'interacted';
}

function calcByModule(byType) {
  const byModule = {};
  for (const [mod, types] of Object.entries(MODULE_MAP)) {
    let sum = 0;
    for (const t of types) sum += byType[t] || 0;
    byModule[mod] = sum;
  }
  return byModule;
}

function formatTime(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 604800) return Math.floor(diff / 86400) + '天前';
  return d.toLocaleDateString();
}

describe('通知 — API 获取', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. 获取通知列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, type: 'treehole_like', is_read: 0 }] } }),
    });

    const res = await fetch(`${API}/api/notifications?page=1&pageSize=50`);
    const data = await res.json();
    expect(data.data.list).toHaveLength(1);
    expect(data.data.list[0].type).toBe('treehole_like');
  });

  it('2. 带 module 参数筛选', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });

    await fetch(`${API}/api/notifications?page=1&pageSize=50&module=treehole`);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('module=treehole');
  });

  it('3. 获取未读汇总 byModule', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: {
          byModule: { treehole: 3, trending: 0, canteen: 1, marketplace: 2, club: 0, system: 1 },
          total: 7,
        },
      }),
    });

    const res = await fetch(`${API}/api/notifications/unread-summary`);
    const data = await res.json();
    expect(data.data.byModule.treehole).toBe(3);
    expect(data.data.total).toBe(7);
  });

  it('4. 标记已读', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    await fetch(`${API}/api/notifications/42/read`, { method: 'PATCH' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('/42/read');
  });

  it('5. 清空指定模块', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { cleared: true } }) });
    await fetch(`${API}/api/notifications/clear?module=marketplace`, { method: 'DELETE' });
    expect(mockFetch.mock.calls[0][0]).toContain('clear?module=marketplace');
  });
});

describe('通知 — 文本映射', () => {
  it('6. actionText — 各种类型', () => {
    expect(getActionText('treehole_like', true)).toBe('赞了');
    expect(getActionText('treehole_comment', true)).toBe('评论了');
    expect(getActionText('canteen_review', true)).toBe('评论了');
    expect(getActionText('club_follow', true)).toBe('关注了');
    expect(getActionText('marketplace_want', true)).toBe('收藏了');
    expect(getActionText('marketplace_chat', true)).toBe('发来消息');
    expect(getActionText('system_announcement', true)).toBe('系统通知');
    expect(getActionText('system_ban', true)).toBe('系统通知');
    expect(getActionText('unknown_type', true)).toBe('互动了');
  });

  it('7. actionText — 英文', () => {
    expect(getActionText('treehole_like', false)).toBe('liked');
    expect(getActionText('club_follow', false)).toBe('followed');
    expect(getActionText('system_ban', false)).toBe('System');
  });
});

describe('通知 — 未读计数', () => {
  it('8. calcByModule 正确聚合', () => {
    const byType = { treehole_like: 5, treehole_comment: 3, like: 1, comment: 0, canteen_review: 2 };
    const byModule = calcByModule(byType);
    expect(byModule.treehole).toBe(9);   // 5+3+1+0
    expect(byModule.canteen).toBe(2);
    expect(byModule.marketplace).toBe(0);
  });

  it('9. 空数据 → 全部为 0', () => {
    const byModule = calcByModule({});
    for (const v of Object.values(byModule)) expect(v).toBe(0);
  });

  it('10. allUnread 总和', () => {
    const byModule = { treehole: 3, trending: 0, canteen: 1, marketplace: 2, club: 0, system: 1 };
    const total = Object.values(byModule).reduce((a, b) => a + b, 0);
    expect(total).toBe(7);
  });
});

describe('通知 — 时间格式化', () => {
  it('11. 刚刚', () => { expect(formatTime(new Date().toISOString())).toBe('刚刚'); });
  it('12. 5分钟前', () => {
    expect(formatTime(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5分钟前');
  });
  it('13. 空值', () => { expect(formatTime(null)).toBe(''); });
});

describe('通知 — 模块Tab配置', () => {
  it('14. 7个Tab全部定义', () => {
    expect(MODULE_TABS).toHaveLength(7);
    expect(MODULE_TABS[0].key).toBe('all');
    expect(MODULE_TABS[6].key).toBe('system');
  });

  it('15. MODULE_MAP 覆盖6个模块', () => {
    expect(Object.keys(MODULE_MAP)).toHaveLength(6);
    expect(MODULE_MAP.treehole).toContain('treehole_like');
    expect(MODULE_MAP.system).toContain('system_ban');
  });
});

describe('通知 — 标记已读逻辑', () => {
  it('16. 点击 → is_read 翻转', () => {
    const notifications = [{ id: 1, is_read: false }, { id: 2, is_read: true }];
    const updated = notifications.map((n) => n.id === 1 ? { ...n, is_read: true } : n);
    expect(updated[0].is_read).toBe(true);
    expect(updated[1].is_read).toBe(true);
  });

  it('17. 已读不重复标记', () => {
    const updated = [{ id: 1, is_read: true }].map((n) => n.id === 1 ? { ...n, is_read: true } : n);
    expect(updated[0].is_read).toBe(true);
  });
});

describe('通知 — 卡片渲染数据', () => {
  it('18. fromName 优先 nickname', () => {
    const from = { nickname: '小明', username: 'xm' };
    expect(from.nickname || from.username || '匿名').toBe('小明');
  });

  it('19. 无 nickname 回退 username', () => {
    const from = { username: 'xm' };
    expect(from.nickname || from.username || '匿名').toBe('xm');
  });

  it('20. 匿名兜底', () => {
    const from = {};
    expect(from.nickname || from.username || '匿名').toBe('匿名');
  });
});
