/**
 * Unit tests for checkSanction middleware
 */
const { checkBan, checkMute, checkSanction } = require('../../middleware/checkSanction');

// Mock the database module
jest.mock('../../database', () => ({
  query: jest.fn(),
}));

const { query } = require('../../database');

describe('checkBan middleware', () => {
  let req, res, next;

  beforeEach(() => {
    query.mockReset();
    req = {
      user: { id: 1, role: 'student' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should call next() when user has no active ban', async () => {
    query.mockResolvedValue([]);

    await checkBan(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('user_sanctions'),
      expect.any(Array)
    );
  });

  it('should return 403 when user has active ban', async () => {
    query.mockResolvedValue([{ id: 1, ends_at: null }]);

    await checkBan(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: -1, banned: true })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 with date message for temp ban', async () => {
    const futureDate = new Date(Date.now() + 86400000);
    query.mockResolvedValue([{ id: 1, ends_at: futureDate }]);

    await checkBan(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: -1, banned: true })
    );
  });

  it('should pass through on database error', async () => {
    query.mockRejectedValue(new Error('DB error'));

    await checkBan(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should pass through when user has no id', async () => {
    req.user = null;
    await checkBan(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should pass through when user id is undefined', async () => {
    req.user = {};
    await checkBan(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('checkMute middleware', () => {
  let req, res, next;

  beforeEach(() => {
    query.mockReset();
    req = { user: { id: 1 } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should call next() when user has no active mute', async () => {
    query.mockResolvedValue([]);

    await checkMute(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when user has active mute', async () => {
    query.mockResolvedValue([{ id: 1, ends_at: null }]);

    await checkMute(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: -1, muted: true })
    );
  });

  it('should return date message for temp mute', async () => {
    const futureDate = new Date(Date.now() + 86400000);
    query.mockResolvedValue([{ id: 1, ends_at: futureDate }]);

    await checkMute(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ muted: true })
    );
  });

  it('should pass through on database error', async () => {
    query.mockRejectedValue(new Error('DB error'));
    await checkMute(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('checkSanction middleware', () => {
  let req, res, next;

  beforeEach(() => {
    query.mockReset();
    req = { user: { id: 1 } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should call next() when user has no active sanctions', async () => {
    query.mockResolvedValue([]);

    await checkSanction(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should block for ban (even when both ban and mute exist)', async () => {
    query.mockResolvedValue([
      { type: 'ban', ends_at: null },
      { type: 'mute', ends_at: null },
    ]);

    await checkSanction(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ banned: true })
    );
  });

  it('should block for mute only', async () => {
    query.mockResolvedValue([
      { type: 'mute', ends_at: null },
    ]);

    await checkSanction(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ muted: true })
    );
  });

  it('should pass through when no user id', async () => {
    req.user = null;
    await checkSanction(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should pass through on database error', async () => {
    query.mockRejectedValue(new Error('DB error'));
    await checkSanction(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should support userId fallback', async () => {
    req.user = { userId: 99 };
    query.mockResolvedValue([]);

    await checkSanction(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      [99, expect.any(Date)]
    );
  });
});
