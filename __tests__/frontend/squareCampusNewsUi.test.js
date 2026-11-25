/**
 * 广场页面 UI 优化（任务管理表「web:广场页面的UI优化」）的源码守卫
 */
const fs = require('fs');
const path = require('path');

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'features', 'campus-news', ...p), 'utf8');

describe('广场校园快讯列表', () => {
  const remote = read('CampusNewsRemote.jsx');
  const feed = read('CampusNewsFeed.jsx');
  const card = read('CampusNewsCard.jsx');

  it('筛选合成一行：分类 + 「只看与我相关」开关（不再有两行长得一样的「全部」）', () => {
    expect(remote).toContain('campus-news-toolbar');
    expect(remote).toContain("aria-pressed={related === '1'}");
    expect(remote).not.toMatch(/'全部通知'/);
  });

  it('切换分类和翻页时保留上一屏；只有一页时不显示翻页；翻页后回到列表顶部', () => {
    expect(remote).toContain('placeholderData: (previous) => previous');
    expect(remote).toContain('pages > 1 &&');
    expect(remote).toContain('scrollIntoView');
  });

  it('英文界面：筛选、翻页、加载、错误都有英文', () => {
    for (const text of ['Relevant to me', 'Loading campus news…', 'Previous', 'Next', 'Log in with a valid account', 'Retry']) {
      expect(remote).toContain(text);
    }
    expect(card).toContain("aria-label={en ? 'Like' : '点赞'}");
  });

  it('列表为空时不再重复显示「没有更多」', () => {
    expect(feed).toContain('!hasMore && posts.length > 0 &&');
  });
});
