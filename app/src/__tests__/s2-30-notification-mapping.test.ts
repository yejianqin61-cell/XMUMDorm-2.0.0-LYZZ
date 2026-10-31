/**
 * é˜¶æ®µC-04 Â· æé†’é€šçŸ¥ â†’ è·¯ç”±çš„å”¯ä¸€æ˜ å°„ï¼ˆD-3ï¼šæœ¬åœ°è½½è·ä¹Ÿè¿› mappingï¼‰
 *
 * åªæµ‹è¿™ä¸€å±‚ï¼šè§£æžå™¨ä¸‰æ€ â†’ è·¯ç”±/å¿½ç•¥/ä¸å¯ç”¨ã€‚è½½è·ç»“æž„æœ¬èº«ç”±ä¹™çš„çº¯å‡½æ•°è´Ÿè´£ï¼Œ
 * æœ¬æ–‡ä»¶æŠŠå®ƒ mock æŽ‰ï¼Œé¿å…é‡å¤æµ‹åˆ«äººé‚£åŠã€‚
 */
jest.mock('@/features/tools/reminders/navigation', () => ({
  resolveClassReminderTarget: jest.fn(),
}));

import { resolveClassReminderTarget } from '@/features/tools/reminders/navigation';
import { resolveReminderRoute } from '@/features/notifications/reminderRoute';

const resolver = resolveClassReminderTarget as jest.MockedFunction<typeof resolveClassReminderTarget>;

beforeEach(() => resolver.mockReset());

describe('æé†’è½½è· â†’ è·¯ç”±ï¼ˆé˜¶æ®µC-04ï¼‰', () => {
  it('å¯ç”¨ï¼šè·³åˆ°è¯¾è¡¨å¹¶å¸¦å‘¨æ¬¡ä¸Žè¯¾ç¨‹ç ', () => {
    resolver.mockReturnValue({
      status: 'ready',
      target: { week: 5, dayOfWeek: 2, courseCode: 'CS 101', semesterId: 'sem-1', date: '2026-10-06', startTime: '08:00:00' },
    });
    expect(resolveReminderRoute({}, 'owner')).toEqual({
      kind: 'route',
      href: '/tools/timetable?week=5&course=CS%20101',
    });
  });

  it('ä¸æ˜¯æœ¬è´¦å·çš„è½½è·ï¼šå¿½ç•¥ï¼Œä¸è·³è½¬', () => {
    resolver.mockReturnValue({ status: 'ignored' });
    expect(resolveReminderRoute({}, 'owner')).toEqual({ kind: 'ignore' });
  });

  it('ç¼ºç›®æ ‡/è¿‡æœŸï¼šä¸å¯ç”¨ï¼Œä¸è·³è½¬', () => {
    resolver.mockReturnValue({ status: 'unavailable' });
    expect(resolveReminderRoute({}, 'owner')).toEqual({ kind: 'unavailable' });
  });

  it('å‘¨æ¬¡ä¸Žè¯¾ç¨‹ç éƒ½è¿›äº† hrefï¼ˆç¼ºä¸€ä¸å¯ï¼‰', () => {
    resolver.mockReturnValue({
      status: 'ready',
      target: { week: 3, dayOfWeek: 1, courseCode: 'MA201', semesterId: 'sem-1', date: '2026-09-22', startTime: '09:00:00' },
    });
    const result = resolveReminderRoute({}, 'owner');
    expect(result.kind).toBe('route');
    if (result.kind === 'route') {
      expect(result.href).toContain('week=3');
      expect(result.href).toContain('course=MA201');
    }
  });
});

