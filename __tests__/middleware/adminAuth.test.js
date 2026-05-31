/**
 * Unit tests for requireAdmin middleware
 */
const requireAdmin = require('../../middleware/adminAuth');

describe('requireAdmin middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('when user is not authenticated', () => {
    it('should return 401 if req.user is null', () => {
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: -1,
        message: '请先登录',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if req.user is undefined', () => {
      req.user = undefined;
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('when user is not admin', () => {
    it('should return 403 for student role', () => {
      req.user = { id: 1, role: 'student' };
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: -1,
        message: '需要管理员权限',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for merchant role', () => {
      req.user = { id: 2, role: 'merchant' };
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 for undefined role', () => {
      req.user = { id: 3 };
      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('when user is admin', () => {
    it('should call next() for admin role', () => {
      req.user = { id: 99, role: 'admin' };
      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
