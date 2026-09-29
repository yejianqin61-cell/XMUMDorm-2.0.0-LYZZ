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

/**
 * ASCII 短词必须用**词边界**匹配。
 *
 * 事故背景（2026-09-29）：词表里有 `fk` / `sb` 这种两字母缩写，
 * 而实现用的是 `String.includes()` 子串匹配。在学习资料场景下，
 * 课件正文/标题里的 USB、ISBN、base64 串、SQL 里的 FK(外键) 全部被误判成违规词。
 */
describe('sensitiveWordFilter checkText —— ASCII 词边界', () => {
  const { checkText } = require('../../middleware/sensitiveWordFilter');
  const words = ['fk', 'sb', 'fuck', '傻逼'];

  it('不再误伤含 sb 的常见词（USB / ISBN / base64）', () => {
    for (const t of [
      'USB 3.0 的传输速率',
      'ISBN 978-7-111-12345-6',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgsb',
      'The task submission is based on the passage',
    ]) {
      expect(checkText(t, words)).toEqual({ hit: false });
    }
  });

  it('独立的 sb / fk 仍然被拦（含贴着中文的写法）', () => {
    expect(checkText('sb', words)).toEqual({ hit: true, word: 'sb' });
    expect(checkText('你 sb 啊', words)).toEqual({ hit: true, word: 'sb' });
    // 中文不是 \w，所以「你sb」之间仍有词边界 —— 拦截能力不受影响
    expect(checkText('你sb', words)).toEqual({ hit: true, word: 'sb' });
    expect(checkText('这个 FK 设计有问题', words)).toEqual({ hit: true, word: 'fk' });
    expect(checkText('SB!', words)).toEqual({ hit: true, word: 'sb' });
  });

  it('大小写不敏感', () => {
    expect(checkText('Sb', words)).toEqual({ hit: true, word: 'sb' });
    expect(checkText('FUCK', words)).toEqual({ hit: true, word: 'fuck' });
  });

  it('非 ASCII 词仍走子串匹配（中文没有词边界概念）', () => {
    expect(checkText('你这个傻逼东西', words)).toEqual({ hit: true, word: '傻逼' });
    expect(checkText('他在说傻逼话', words)).toEqual({ hit: true, word: '傻逼' });
  });

  it('空输入安全返回', () => {
    expect(checkText('', words)).toEqual({ hit: false });
    expect(checkText(null, words)).toEqual({ hit: false });
    expect(checkText('任意文本', [])).toEqual({ hit: false });
    expect(checkText('任意文本', null)).toEqual({ hit: false });
  });

  it('含正则元字符的词按字面量处理（走子串分支，不被当成模式）', () => {
    // 若 `a.c` 被当正则，`abc` 会命中 —— 断言它没有
    expect(checkText('abc', ['a.c'])).toEqual({ hit: false });
    expect(checkText('x a.c y', ['a.c'])).toEqual({ hit: true, word: 'a.c' });
  });
});
