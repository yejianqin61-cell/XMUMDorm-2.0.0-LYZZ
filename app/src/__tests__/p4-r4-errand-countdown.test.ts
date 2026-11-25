/**
 * 第四轮 R4-25：待接单的跑腿显示截止倒计时。
 */
import { errandTimeLeft } from '@/features/errand/model';

const now = Date.parse('2026-11-26T00:00:00Z');
const at = (iso: string) => errandTimeLeft(iso, now);

describe('R4-25 · 截止倒计时', () => {
  it('按天 / 小时 / 分钟分档，过期单独标', () => {
    expect(at('2026-11-28T01:00:00Z')).toEqual({ unit: 'days', n: 2 });
    expect(at('2026-11-26T05:30:00Z')).toEqual({ unit: 'hours', n: 5 });
    expect(at('2026-11-26T00:20:00Z')).toEqual({ unit: 'minutes', n: 20 });
    expect(at('2026-11-25T23:00:00Z')).toEqual({ unit: 'overdue', n: 0 });
    expect(errandTimeLeft(null, now)).toBeNull();
    expect(errandTimeLeft('bad', now)).toBeNull();
  });
});
