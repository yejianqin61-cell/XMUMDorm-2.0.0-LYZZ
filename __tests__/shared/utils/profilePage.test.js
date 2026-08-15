const { appendUniquePosts, parsePositiveUserId } = require('../../../shared/utils/profilePage');

describe('profile page helpers', () => {
  it.each([
    ['7', 7],
    ['7abc', 0],
    ['7.5', 0],
    ['-7', 0],
    ['0', 0],
    ['01', 0],
    ['9007199254740992', 0],
  ])('parses %s as %i', (value, expected) => {
    expect(parsePositiveUserId(value)).toBe(expected);
  });

  it('appends a page without duplicating posts already rendered', () => {
    const firstPage = [{ id: 3 }, { id: 2 }];
    const nextPage = [{ id: 2 }, { id: 1 }];

    expect(appendUniquePosts(firstPage, nextPage)).toEqual([{ id: 3 }, { id: 2 }, { id: 1 }]);
  });
});
