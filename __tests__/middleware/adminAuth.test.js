/**
 * Unit tests for requireAdmin middleware (with DB role lookup)
 */
jest.mock('../../database', () => ({
  query: jest.fn(),
}));

const { query } = require('../../database');
const requireAdmin = require('../../middleware/adminAuth');

describe('requireAdmin middleware', () => {
  let req, res, next;

  beforeEach(() => {
    query.mockReset();
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('when user is not authenticated', () => {
    it('returns 401 for null user', async () => {
      await requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for undefined user', async () => {
      req.user = undefined;
      await requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('when JWT already has admin role', () => {
    it('calls next() immediately without DB query', async () => {
      req.user = { id: 99, role: 'admin' };
      await requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('when JWT role is not admin', () => {
    it('calls next() if DB confirms admin role', async () => {
      req.user = { id: 1, role: 'student' };
      query.mockResolvedValue([{ role: 'admin' }]);

      await requireAdmin(req, res, next);

      expect(query).toHaveBeenCalledWith(
        'SELECT role FROM users WHERE id = ? LIMIT 1',
        [1]
      );
      expect(req.user.role).toBe('admin'); // role updated
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 if DB does not confirm admin', async () => {
      req.user = { id: 1, role: 'student' };
      query.mockResolvedValue([{ role: 'student' }]);

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: -1,
        message: '需要管理员权限',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 if DB returns empty result', async () => {
      req.user = { id: 999, role: 'student' };
      query.mockResolvedValue([]);

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 500 on database error', async () => {
      req.user = { id: 1, role: 'student' };
      query.mockRejectedValue(new Error('DB connection lost'));

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: -1,
        message: '权限校验失败',
      });
    });

    it('handles undefined role in JWT', async () => {
      req.user = { id: 1 };
      query.mockResolvedValue([{ role: 'admin' }]);

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
