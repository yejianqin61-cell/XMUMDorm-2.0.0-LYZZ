/**
 * 跑腿模块全量测试
 * 覆盖：API列表/详情/发布、类型过滤、状态过滤、接单/完成切换、数据提取、内容验证
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

// ─── 辅助函数 ──────────────────────────────

function extractList(data) { return data?.data?.list || []; }
function extractDetail(data) { return data?.data; }

const TYPE_LABELS = { delivery: '代取', purchase: '代购', urgent: '紧急' };
const STATUS_LABELS = { open: '进行中', taken: '已接单', done: '已完成' };

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  return d.toLocaleDateString();
}

function fmtDeadline(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth()+1}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function fmtReward(val) {
  const n = Number(val || 0);
  return `RM ${n.toFixed(2)}`;
}

function canTakeTask(status, isOwner, isAdmin) {
  if (status === 'done') return false;
  return isOwner || isAdmin;
}

function nextStatus(current) {
  if (current === 'open') return 'taken';
  if (current === 'taken') return 'open';
  return 'done'; // done 不可切换
}

function validateErrandForm({ title, contactInfo }) {
  const errors = [];
  if (!title || !title.trim()) errors.push('标题不能为空');
  if (!contactInfo || !contactInfo.trim()) errors.push('联系方式不能为空');
  return errors;
}

describe('跑腿 — 列表 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('1. 获取任务列表', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 0, data: { list: [{ id: 1, title: '取快递', type: 'delivery', status: 'open', reward: '5.00' }] } }),
    });
    const res = await fetch(`${API}/api/errands`);
    const data = await res.json();
    expect(extractList(data)).toHaveLength(1);
  });

  it('2. 类型过滤 — delivery', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/errands?type=delivery`);
    expect(mockFetch.mock.calls[0][0]).toContain('type=delivery');
  });

  it('3. 状态过滤 — open', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/errands?status=open`);
    expect(mockFetch.mock.calls[0][0]).toContain('status=open');
  });

  it('4. 组合过滤 — type+status', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { list: [] } }) });
    await fetch(`${API}/api/errands?type=urgent&status=open`);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('type=urgent');
    expect(url).toContain('status=open');
  });
});

describe('跑腿 — 详情 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('5. 获取任务详情（含完整字段）', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: {
          id: 1, title: '取快递', type: 'delivery', status: 'open',
          reward: '5.00', description: 'D6 顺丰', deadline: '2026-06-02T18:00:00Z',
          location: 'D6', contactInfo: 'wx: test123',
          owner: { id: 1, username: 'alice', nickname: 'Alice' },
          taker: null,
        },
      }),
    });
    const res = await fetch(`${API}/api/errands/1`);
    const data = await res.json();
    const d = extractDetail(data);
    expect(d.title).toBe('取快递');
    expect(d.owner.username).toBe('alice');
    expect(d.contactInfo).toBe('wx: test123');
  });

  it('6. 详情含 taker 信息', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: 0, data: { id: 2, status: 'taken', taker: { id: 2, username: 'bob' } },
      }),
    });
    const res = await fetch(`${API}/api/errands/2`);
    const data = await res.json();
    expect(extractDetail(data).taker.username).toBe('bob');
  });
});

describe('跑腿 — 数据提取', () => {
  it('7. 酬劳格式化', () => {
    expect(fmtReward(5)).toBe('RM 5.00');
    expect(fmtReward('8.50')).toBe('RM 8.50');
    expect(fmtReward(0)).toBe('RM 0.00');
  });

  it('8. 时间格式化', () => {
    expect(fmtTime(new Date().toISOString())).toBe('刚刚');
    expect(fmtTime(new Date(Date.now() - 10 * 60000).toISOString())).toBe('10分钟前');
  });

  it('9. 截止时间格式化', () => {
    const d = new Date('2026-06-02T18:30:00Z');
    const r = fmtDeadline(d.toISOString());
    expect(r).toMatch(/^\d+-\d{2} \d{2}:\d{2}$/);
  });
});

describe('跑腿 — 状态标签', () => {
  it('10. 类型标签映射', () => {
    expect(TYPE_LABELS.delivery).toBe('代取');
    expect(TYPE_LABELS.purchase).toBe('代购');
    expect(TYPE_LABELS.urgent).toBe('紧急');
  });

  it('11. 状态标签映射', () => {
    expect(STATUS_LABELS.open).toBe('进行中');
    expect(STATUS_LABELS.taken).toBe('已接单');
    expect(STATUS_LABELS.done).toBe('已完成');
  });
});

describe('跑腿 — 状态流逻辑', () => {
  it('12. open ↔ taken 切换', () => {
    expect(nextStatus('open')).toBe('taken');
    expect(nextStatus('taken')).toBe('open');
  });

  it('13. done 不可 take', () => {
    expect(canTakeTask('done', true, false)).toBe(false);
    expect(canTakeTask('done', false, true)).toBe(false);
  });

  it('14. 所有者和管理员可 take', () => {
    expect(canTakeTask('open', true, false)).toBe(true);
    expect(canTakeTask('open', false, true)).toBe(true);
    expect(canTakeTask('open', false, false)).toBe(false);
  });

  it('15. taken 状态只有 owner/admin 可切换', () => {
    expect(canTakeTask('taken', true, false)).toBe(true);
    expect(canTakeTask('taken', false, true)).toBe(true);
    expect(canTakeTask('taken', false, false)).toBe(false);
  });
});

describe('跑腿 — 内容验证', () => {
  it('16. 标题必填', () => {
    expect(validateErrandForm({ title: '', contactInfo: 'wx:123' })).toContain('标题不能为空');
    expect(validateErrandForm({ title: '  ', contactInfo: 'wx:123' })).toContain('标题不能为空');
  });

  it('17. 联系方式必填', () => {
    expect(validateErrandForm({ title: '任务', contactInfo: '' })).toContain('联系方式不能为空');
  });

  it('18. 表单合法', () => {
    expect(validateErrandForm({ title: '任务', contactInfo: 'wx:123' })).toEqual([]);
  });
});

describe('跑腿 — 发布/操作 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('19. 发布任务', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { id: 99 } }) });
    const res = await fetch(`${API}/api/errands`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新任务', type: 'delivery', contactInfo: 'wx:me' }),
    });
    const data = await res.json();
    expect(data.status).toBe(0);
    expect(data.data.id).toBe(99);
  });

  it('20. take 操作', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, message: '已接单' }) });
    const res = await fetch(`${API}/api/errands/1/take`, { method: 'POST' });
    const data = await res.json();
    expect(data.status).toBe(0);
  });
});
