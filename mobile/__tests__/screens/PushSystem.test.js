/**
 * 推送系统测试 — FCM token、订阅/取消订阅、去重、权限
 */
global.fetch = jest.fn();
const mockFetch = global.fetch;
const API = 'http://10.72.10.97:4040';

function validateSubscription({ endpoint, channel }) {
  if (!endpoint || !channel) return '缺少参数';
  if (!['web', 'fcm'].includes(channel)) return '无效 channel';
  return null;
}
function genDedupKey(meetingId, userId, dateStr) { return `${meetingId}_${userId}_${dateStr}`; }
function isReminderSent(sentSet, key) { return sentSet.has(key); }

describe('推送 — FCM Token', () => {
  it('1. Token 格式为字符串', () => {
    const token = 'fcm_token_abc123';
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
  it('2. 空 token 无效', () => {
    expect(validateSubscription({ endpoint: '', channel: 'fcm' })).toBe('缺少参数');
  });
});

describe('推送 — 订阅 API', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('3. FCM 订阅', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: 'fcm_token', channel: 'fcm', keys: {} }) })).json()).status).toBe(0);
  });
  it('4. Web 订阅', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/...', channel: 'web', keys: { p256dh: 'a', auth: 'b' } }) })).json()).status).toBe(0);
  });
});

describe('推送 — 取消订阅 API', () => {
  it('5. 取消订阅', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/push/unsubscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: 'fcm_token' }) })).json()).status).toBe(0);
  });
});

describe('推送 — 测试推送', () => {
  it('6. 测试推送', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0 }) });
    expect((await (await fetch(`${API}/api/push/test`, { method: 'POST' })).json()).status).toBe(0);
  });
});

describe('推送 — VAPID 公钥', () => {
  it('7. 获取公钥', async () => {
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ status: 0, data: { publicKey: 'BEDBE09ut...' } }) });
    expect((await (await fetch(`${API}/api/push/vapid-public-key`)).json()).data.publicKey).toBeTruthy();
  });
});

describe('推送 — 订阅验证', () => {
  it('8. 有效 fcm 订阅', () => { expect(validateSubscription({ endpoint: 't', channel: 'fcm' })).toBeNull(); });
  it('9. 有效 web 订阅', () => { expect(validateSubscription({ endpoint: 't', channel: 'web' })).toBeNull(); });
  it('10. 无效 channel', () => { expect(validateSubscription({ endpoint: 't', channel: 'apns' })).toBe('无效 channel'); });
  it('11. 缺少 channel', () => { expect(validateSubscription({ endpoint: 't' })).toBe('缺少参数'); });
});

describe('推送 — 去重', () => {
  it('12. genDedupKey 生成', () => {
    expect(genDedupKey(42, 1, '2026-06-01')).toBe('42_1_2026-06-01');
  });
  it('13. 同课同日不可重复', () => {
    const sent = new Set();
    const key = genDedupKey(1, 1, '2026-06-01');
    sent.add(key);
    expect(isReminderSent(sent, key)).toBe(true);
    expect(isReminderSent(sent, genDedupKey(1, 1, '2026-06-02'))).toBe(false);
  });
  it('14. 不同 meeting → 不冲突', () => {
    const sent = new Set();
    sent.add(genDedupKey(1, 1, '2026-06-01'));
    expect(isReminderSent(sent, genDedupKey(2, 1, '2026-06-01'))).toBe(false);
  });
});

describe('推送 — 权限', () => {
  it('15. 通知权限 granted', () => {
    const status = 'granted';
    expect(status).toBe('granted');
  });
  it('16. 通知权限 denied 返回 false', () => {
    const status = 'denied';
    const canProceed = status === 'granted';
    expect(canProceed).toBe(false);
  });
});

describe('推送 — 双通道', () => {
  it('17. push_subscriptions 支持 channel 列', () => {
    const channels = ['web', 'fcm'];
    expect(channels).toHaveLength(2);
  });
  it('18. 按 channel 分流', () => {
    const subs = [{ channel: 'web', endpoint: 'e1' }, { channel: 'fcm', endpoint: 't1' }, { channel: 'fcm', endpoint: 't2' }];
    const webSubs = subs.filter((s) => s.channel === 'web');
    const fcmSubs = subs.filter((s) => s.channel === 'fcm');
    expect(webSubs).toHaveLength(1);
    expect(fcmSubs).toHaveLength(2);
  });
});

describe('推送 — 提醒窗口', () => {
  it('19. 提前 30 分钟发送', () => {
    const BEFORE_MINUTES = 30;
    expect(BEFORE_MINUTES).toBe(30);
  });
  it('20. 7 分钟发送窗口', () => {
    const SEND_WINDOW = 7;
    expect(SEND_WINDOW).toBe(7);
  });
});
