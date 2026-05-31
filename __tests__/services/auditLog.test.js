/**
 * Unit tests for auditLog service
 */
const { logAudit } = require('../../services/auditLog');

jest.mock('../../database', () => ({
  query: jest.fn(),
}));

const { query } = require('../../database');

describe('auditLog service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  describe('logAudit', () => {
    it('should insert an audit log entry', async () => {
      query.mockResolvedValue([{ insertId: 1 }]);

      await logAudit({
        userId: 1,
        role: 'admin',
        action: 'ADMIN_BAN_USER',
        targetType: 'user',
        targetId: 5,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        meta: { reason: 'test' },
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([1, 'admin', 'ADMIN_BAN_USER', 'user', 5, '127.0.0.1'])
      );
    });

    it('should not crash when action is missing', async () => {
      await logAudit({ userId: 1 });

      expect(query).not.toHaveBeenCalled();
    });

    it('should not crash on database error', async () => {
      query.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        logAudit({
          userId: 1,
          role: 'admin',
          action: 'ADMIN_TEST',
        })
      ).resolves.toBeUndefined();
    });

    it('should handle null/undefined optional fields', async () => {
      query.mockResolvedValue([{ insertId: 2 }]);

      await logAudit({
        action: 'ADMIN_TEST',
        // No userId, role, targetType, targetId, ip, userAgent, meta
      });

      expect(query).toHaveBeenCalled();
      const callArgs = query.mock.calls[0][1];
      // userId should be null
      expect(callArgs[0]).toBeNull();
      // role should be null
      expect(callArgs[1]).toBeNull();
    });

    it('should serialize meta object to JSON', async () => {
      query.mockResolvedValue([{ insertId: 3 }]);

      await logAudit({
        action: 'ADMIN_BAN_USER',
        userId: 1,
        meta: { reason: '违规', duration: 7 },
      });

      expect(query).toHaveBeenCalled();
      const sql = query.mock.calls[0][0];
      const params = query.mock.calls[0][1];
      expect(sql).toContain('INSERT INTO audit_logs');
      // meta should be JSON string
      const metaParam = params[7]; // meta is the 8th parameter
      expect(typeof metaParam).toBe('string');
      expect(JSON.parse(metaParam)).toEqual({ reason: '违规', duration: 7 });
    });

    it('should truncate long meta strings', async () => {
      query.mockResolvedValue([{ insertId: 4 }]);

      const longMeta = { data: 'x'.repeat(3000) };

      await logAudit({
        action: 'ADMIN_TEST',
        userId: 1,
        meta: longMeta,
      });

      const metaParam = query.mock.calls[0][1][7];
      expect(metaParam.length).toBeLessThanOrEqual(2000);
    });
  });
});
