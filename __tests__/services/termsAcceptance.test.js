const { query } = require('../../database');
const { CURRENT_TERMS_VERSION, getCurrentTermsStatus, requireCurrentTerms } = require('../../services/termsAcceptance');

jest.mock('../../database', () => ({ query: jest.fn() }));

describe('versioned terms acceptance service', () => {
  beforeEach(() => query.mockReset());

  it('uses the current version and reports an unaccepted user', async () => {
    query.mockResolvedValueOnce([]);

    await expect(getCurrentTermsStatus(7)).resolves.toEqual({
      version: CURRENT_TERMS_VERSION,
      accepted: false,
      accepted_at: null,
    });
    expect(query.mock.calls[0][1]).toEqual([7, CURRENT_TERMS_VERSION]);
  });

  it('blocks publishing when the current version is not accepted', async () => {
    query.mockResolvedValueOnce([]);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await requireCurrentTerms({ user: { id: 7 } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TERMS_NOT_ACCEPTED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows publishing only after a current-version record exists', async () => {
    query.mockResolvedValueOnce([{ accepted_at: '2026-10-09 12:00:00' }]);
    const next = jest.fn();

    await requireCurrentTerms({ user: { id: 7 } }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
