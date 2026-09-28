/**
 * 树洞移动端布局守卫
 *
 * 2026-09-27：实测 360×732 触屏环境（真机分支 `pointer: coarse`）发现两个回归：
 *
 * 1. `TreeHole.jsx` 漏了 `.treehole-content` 这层包裹（`TreeHole.css` 里一直有、PostSearch /
 *    PostTagFeed 也在用），于是移动端页面既没有 12px 左右留白（卡片贴屏幕边缘），
 *    也没有为固定底栏留出底部间距 —— 实测最后一张卡片被 Tab 栏压住 86px。
 * 2. 卡片图片的 `eager` 参数传的是整表共用的 `isCoarse`，在触屏设备上等于给一次渲染的
 *    150+ 张卡片全部打上 `loading="eager"`（桌面端反而是 lazy），在蜂窝网络下把整页图片
 *    都排进加载队列。
 *
 * 这里的断言就是这两个回归的「别再犯」。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');

const TREEHOLE_JSX = read('frontend', 'src', 'pages', 'TreeHole.jsx');
const TREEHOLE_CSS = read('frontend', 'src', 'pages', 'TreeHole.css');
const TOOLBAR_CSS = read('frontend', 'src', 'components', 'TreeHoleToolbar.css');
const TOOLBAR_JSX = read('frontend', 'src', 'components', 'TreeHoleToolbar.jsx');

describe('树洞移动端：底部让开固定 TabBar', () => {
  it('.treehole-content 包裹层存在（CSS 里的内边距才有作用对象）', () => {
    expect(TREEHOLE_JSX).toContain('className="treehole-content"');
  });

  it('.treehole-content 的底部内边距含 TabBar 高度 + 10px 底部偏移', () => {
    const block = TREEHOLE_CSS.match(/\.treehole-content\s*\{[^}]*\}/);
    expect(block).not.toBeNull();
    const rule = block[0];
    expect(rule).toContain('var(--tabbar-height');
    // 底栏是 bottom:10px + height:76px，只减高度会差 10px
    expect(rule).toMatch(/\+\s*10px/);
    expect(rule).toContain('var(--safe-bottom');
  });

  it('桌面端与平板端继续把内边距清零（不引入额外留白）', () => {
    expect(TREEHOLE_CSS).toMatch(/\.app-layout--desktop-shell\s+\.treehole-content\s*\{[^}]*padding:\s*0/);
    expect(TREEHOLE_CSS).toMatch(/\.site-web-shell--tablet\s+\.treehole-content\s*\{[^}]*padding:\s*0/);
  });
});

describe('树洞移动端：图片不整页 eager', () => {
  it('卡片 eager 由首屏名单决定，而不是整表共用的 isCoarse', () => {
    expect(TREEHOLE_JSX).not.toContain('eager={isCoarse}');
    expect(TREEHOLE_JSX).toContain('isEagerCard(entry.post)');
  });

  it('首屏 eager 名单是有上限的（不超过一屏卡片数）', () => {
    const m = TREEHOLE_JSX.match(/const EAGER_CARD_COUNT\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    const count = Number(m[1]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(12);
  });

  it('列表其余卡片仍然走原生 lazy', () => {
    expect(TREEHOLE_JSX).toContain("loading={eager ? 'eager' : 'lazy'}");
  });
});

describe('树洞移动端：触控目标与可读性', () => {
  it('标签胶囊在窄屏撑到 44px 触控高度并垂直居中', () => {
    const mobile = TOOLBAR_CSS.slice(TOOLBAR_CSS.indexOf('@media (max-width: 767px)'));
    expect(mobile).toContain('.treehole-tag-scroll button');
    expect(mobile).toContain('min-height: 44px');
    expect(mobile).toContain('align-items: center');
  });

  it('搜索框在窄屏有可见的占位提示', () => {
    expect(TOOLBAR_JSX).toContain('placeholder={isZh ?');
  });

  it('卡片作者名在窄屏放大到 11px 并收紧省略宽度', () => {
    const block = TREEHOLE_CSS.match(/@media \(max-width: 767px\)\s*\{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block[0]).toContain('.treehole-glass-author');
    expect(block[0]).toContain('font-size: 11px');
    expect(block[0]).toContain('max-width: 8em');
  });
});
