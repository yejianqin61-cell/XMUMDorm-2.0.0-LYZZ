jest.mock('../../database', () => ({
  query: jest.fn(),
}));

describe('sensitiveWordFilter refreshCache', () => {
  let sensitiveWordFilter;
  let query;

  beforeEach(() => {
    jest.resetModules();
    ({ query } = require('../../database'));
    query.mockReset();
    sensitiveWordFilter = require('../../middleware/sensitiveWordFilter');
  });

  it('normalizes enabled word rows from the database', async () => {
    query.mockResolvedValueOnce([
      { word: ' spam ' },
      { word: '' },
      { word: null },
      { word: 'Scam' },
    ]);

    const words = await sensitiveWordFilter.refreshCache();

    expect(words).toEqual(['spam', 'Scam']);
  });

  it('falls back to the previous cache when the query result is malformed', async () => {
    query.mockResolvedValueOnce([{ word: 'spam' }]);
    await sensitiveWordFilter.refreshCache();

    query.mockResolvedValueOnce({ word: 'not-an-array' });

    const words = await sensitiveWordFilter.refreshCache();

    expect(words).toEqual(['spam']);
  });
});
