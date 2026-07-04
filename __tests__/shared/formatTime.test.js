const { formatPostTime } = require('../../shared/utils/formatTime');

describe('formatPostTime', () => {
  const now = new Date();
  const minutesAgo = (m) => new Date(now - m * 60000);
  const hoursAgo = (h) => new Date(now - h * 3600000);
  const daysAgo = (d) => new Date(now - d * 86400000);

  describe('Chinese locale (default)', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatPostTime(null)).toBe('');
      expect(formatPostTime(undefined)).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(formatPostTime('not-a-date')).toBe('');
    });

    it('returns 刚刚 for < 1 minute', () => {
      expect(formatPostTime(minutesAgo(0.5))).toBe('刚刚');
    });

    it('returns N 分钟前 for < 60 minutes', () => {
      expect(formatPostTime(minutesAgo(5))).toBe('5 分钟前');
      expect(formatPostTime(minutesAgo(59))).toBe('59 分钟前');
    });

    it('returns N 小时前 for < 24 hours', () => {
      expect(formatPostTime(hoursAgo(3))).toBe('3 小时前');
    });

    it('returns 昨天 for 1 day ago', () => {
      expect(formatPostTime(daysAgo(1))).toBe('昨天');
    });

    it('returns N 天前 for < 7 days', () => {
      expect(formatPostTime(daysAgo(3))).toBe('3 天前');
    });

    it('supports backward-compat boolean second argument', () => {
      const result = formatPostTime(minutesAgo(5), true);
      expect(result).toContain('202');
    });
  });

  describe('English locale', () => {
    it('returns just now for < 1 minute', () => {
      expect(formatPostTime(minutesAgo(0.5), { locale: 'en' })).toBe('just now');
    });

    it('returns N min ago for < 60 minutes', () => {
      expect(formatPostTime(minutesAgo(10), { locale: 'en' })).toBe('10 min ago');
    });

    it('returns yesterday for 1 day ago', () => {
      expect(formatPostTime(daysAgo(1), { locale: 'en' })).toBe('yesterday');
    });

    it('returns N days ago for < 7 days', () => {
      expect(formatPostTime(daysAgo(5), { locale: 'en' })).toBe('5 days ago');
    });
  });

  describe('absolute mode', () => {
    it('returns formatted date string', () => {
      const date = new Date('2026-01-15T10:30:00');
      const result = formatPostTime(date, { absolute: true, locale: 'zh' });
      expect(result).toContain('2026');
    });
  });
});
