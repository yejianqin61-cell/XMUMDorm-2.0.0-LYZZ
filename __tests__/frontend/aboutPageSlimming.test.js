/**
 * 「关于」页收束回归测试
 *
 * 需求（2026-09-27 用户裁定）：
 * 1. /about/profile 上的「团队介绍 / 编者的话 / 特别鸣谢 / 联系我们」四项全部去掉；
 * 2. 连页面、路由、以及「我的」页的「特别鸣谢」入口一并删干净，不留可达路径；
 * 3. 「关于我们」统一改称「关于」（页面大标题 + 页面标题 + 「我的」页入口）；
 * 4. Web（frontend）与 Capacitor App（frontend-app）两端同步；
 *    RN（mobile）是另一套关于体系，不在本次范围内。
 *
 * 说明：页面注释里保留了被下线内容的说明文字，所以断言一律带引号匹配文案字面量，
 * 避免把注释误判成仍在渲染的条目。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');
const exists = (...segments) => fs.existsSync(path.resolve(ROOT, ...segments));

const APPS = ['frontend', 'frontend-app'];

/** 已下线的四个子页面（含它们独占的样式文件） */
const REMOVED_FILES = [
  ['src', 'pages', 'AboutTeam.jsx'],
  ['src', 'pages', 'AboutTeam.css'],
  ['src', 'pages', 'AboutThanks.jsx'],
  ['src', 'pages', 'AboutEditor.jsx'],
  ['src', 'pages', 'AboutEditorNote.jsx'],
  ['src', 'pages', 'AboutEditorNote.css'],
  ['src', 'pages', 'ContactUs.jsx'],
];

/** 已下线的路由（layoutRoutes 里不能再注册） */
const REMOVED_ROUTES = ['about/team', 'about/editor-note', 'about/thanks', 'about/contact'];

/** 已下线的入口 path（不能在任何页面里残留链接） */
const REMOVED_PATHS = ['/about/team', '/about/editor-note', '/about/thanks', '/about/contact'];

/** 已下线的中英文条目名（带引号匹配，避开注释里的说明文字） */
const REMOVED_LABELS = [
  "'团队介绍'",
  "'编者的话'",
  "'特别鸣谢'",
  "'联系我们'",
  "'Special Thanks'",
  '"Editor\'s Note"',
  "'Contact us'",
];

describe('关于页收束：四个子页整体下线', () => {
  it.each(APPS)('%s：页面文件已删除', (app) => {
    for (const parts of REMOVED_FILES) {
      expect(exists(app, ...parts)).toBe(false);
    }
  });

  it.each(APPS)('%s：路由不再注册这四条', (app) => {
    const routes = read(app, 'src', 'routes', 'layoutRoutes.jsx');
    for (const route of REMOVED_ROUTES) {
      expect(routes).not.toContain(`path="${route}"`);
    }
    expect(routes).not.toContain("import('../pages/AboutTeam')");
    expect(routes).not.toContain("import('../pages/AboutThanks')");
    expect(routes).not.toContain("import('../pages/AboutEditorNote')");
    expect(routes).not.toContain("import('../pages/ContactUs')");
  });

  it.each(APPS)('%s：关于页只留说明性条目，且大标题是「关于」', (app) => {
    const page = read(app, 'src', 'pages', 'AboutProfile.jsx');
    expect(page).toContain("isZh ? '关于' : 'About'");
    for (const label of REMOVED_LABELS) {
      expect(page).not.toContain(label);
    }
    for (const badPath of REMOVED_PATHS) {
      expect(page).not.toContain(`to="${badPath}"`);
    }
    // 保留的三项
    expect(page).toContain('to="/about/algorithm"');
    expect(page).toContain('to="/about/level-algorithm"');
    expect(page).toContain('to="/about/disclaimer"');
  });

  it.each(APPS)('%s：「我的」页不再有特别鸣谢入口，关于入口改称「关于」', (app) => {
    const myzone = read(app, 'src', 'pages', 'MyZone.jsx');
    expect(myzone).toContain("aboutProfile: isZh ? '关于' : 'About'");
    expect(myzone).not.toContain('aboutThanks');
    expect(myzone).not.toContain('to="/about/thanks"');
  });
});

describe('「关于」改名的其余落点', () => {
  it('Web 页面标题映射：/about/profile → 关于 / About', () => {
    const titles = read('frontend', 'src', 'config', 'pageTitles.js');
    expect(titles).toContain("'/about/profile': '关于'");
    expect(titles).toContain("'/about/profile': 'About'");
    expect(titles).not.toContain("pathname === '/about/thanks'");
    expect(titles).not.toContain("pathname === '/about/team'");
    expect(titles).not.toContain("pathname === '/about/editor-note'");
  });

  it('App 顶栏标题表与分支：/about/profile → 关于 / About', () => {
    const layout = read('frontend-app', 'src', 'components', 'Layout.jsx');
    expect(layout).toContain("'/about/profile': '关于'");
    expect(layout).toContain("'/about/profile': 'About'");
    expect(layout).not.toContain("pathname === '/about/team'");
    expect(layout).not.toContain("pathname === '/about/editor-note'");
    expect(layout).not.toContain("pathname === '/about/thanks'");
  });

  it('Web 侧边栏不再把已下线路径算作「广场」高亮', () => {
    const nav = read('frontend', 'src', 'components', 'shell', 'siteShellNav.js');
    expect(nav).toContain("'/about/profile'");
    for (const badPath of ['/about/thanks', '/about/team', '/about/editor-note']) {
      expect(nav).not.toContain(`'${badPath}'`);
    }
  });

  it('App TabBar 的「我的」归属集合只留还活着的路径', () => {
    const tabbar = read('frontend-app', 'src', 'components', 'TabBar.jsx');
    expect(tabbar).toContain("'/about/profile'");
    expect(tabbar).toContain("'/about/disclaimer'");
    for (const badPath of REMOVED_PATHS) {
      expect(tabbar).not.toContain(`'${badPath}'`);
    }
  });
});
