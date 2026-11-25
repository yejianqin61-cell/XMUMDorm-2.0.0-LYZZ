/**
 * 左侧导航每一项都是独立对象。
 * 背景（2026-11-25）：#149 贡献站和 #150 交友同时在「加入我们」前面加导航项，合并冲突时被拼进了同一个对象，
 * 后面的键覆盖前面的，线上「交友」入口消失，Web lint 也因 no-dupe-keys 失败。
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'components', 'shell', 'siteShellNav.js'), 'utf8');

describe('左侧导航项', () => {
  const block = src.slice(src.indexOf('SITE_PRIMARY_NAV_ITEMS'), src.indexOf('SITE_FRIENDLY_LINK_ITEMS'));
  const items = block.split(/\n\s*\{\s*\n/).slice(1);

  it('每个导航对象只有一个 key', () => {
    for (const item of items) {
      const body = item.slice(0, item.indexOf('}'));
      expect((body.match(/\bkey:/g) || []).length).toBe(1);
    }
  });

  it('交友和贡献站都在，且 key 不重复', () => {
    const keys = [...block.matchAll(/\bkey:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(keys).toEqual(expect.arrayContaining(['date', 'contribute', 'join-us']));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
