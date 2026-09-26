/**
 * 品牌文案与「加入我们」回归测试
 *
 * 需求（2026-09-26）：
 * 1. 标签页不要再显示「Jack 校园」，全站这个字样都去掉，改成 Dorm
 * 2. 顶部 topbar 的「Dorm」改成「XMUM Dorm」
 * 3. 左侧栏加「加入我们」，页面显示指定的招募文案与微信号
 *
 * 背景：标签页标题是 frontend/index.html 里的**静态** <title>，与路由无关
 * （Layout.jsx 虽然算出了 resolvePageTitle()，但那个值从没写进 document.title，
 *  pageTitles.js 实际是死代码）。所以改标题必须改 index.html。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');

/** 招募文案（中文为产品给定原文，必须逐字一致） */
const JOIN_LEAD_ZH =
  '如果你想学习怎么用AI开发出你自己的网站，如果你想共同成为Dorm的创造者，如果你发现本站有任何使用问题，那就快快联系我们。';
const WECHAT_ID = 'xmumdorm666';
const CONTACT_EMAIL = 'yejianqin61@gmail.com';

describe('标签页标题改成 Dorm，且不再出现 Jack 字样', () => {
  it('Web 的 index.html 标题是 Dorm', () => {
    const html = read('frontend', 'index.html');
    expect(html).toContain('<title>Dorm</title>');
    expect(html).not.toMatch(/Jack/i);
  });

  it('App（Capacitor）的 index.html 标题也是 Dorm', () => {
    const html = read('frontend-app', 'index.html');
    expect(html).toContain('<title>Dorm</title>');
    expect(html).not.toMatch(/Jack/i);
  });

  it('PWA manifest 名字保持 Dorm', () => {
    const manifest = JSON.parse(read('frontend', 'public', 'manifest.json'));
    expect(manifest.name).toBe('Dorm');
    expect(manifest.short_name).toBe('Dorm');
  });

  it('用户可见的其它位置也不再有 Jack 字样', () => {
    // 只检查「会被用户看到」的文件；docs/、database.js 的库名 jack_campus、
    // .env 的 jack-dorm-assets 桶名属于内部标识，不在本次范围内。
    const userFacing = [
      ['frontend', 'index.html'],
      ['frontend-app', 'index.html'],
      ['html', 'register.html'],
      ['server.js'],
      ['frontend', 'src', 'pages', 'PrivacyPolicy.jsx'],
    ];
    for (const parts of userFacing) {
      expect(read(...parts)).not.toMatch(/Jack/i);
    }
  });

  it('后端健康检查文案改成 Dorm', () => {
    expect(read('server.js')).toContain("message: 'Dorm 后端服务运行正常！'");
  });
});

describe('顶部 topbar 品牌改成 XMUM Dorm', () => {
  it('SiteHeader 显示 XMUM Dorm', () => {
    const src = read('frontend', 'src', 'components', 'shell', 'SiteHeader.jsx');
    expect(src).toContain('<strong>XMUM Dorm</strong>');
    expect(src).not.toMatch(/<strong>Dorm<\/strong>/);
  });

  it('品牌加长后不会被折成两行', () => {
    const css = read('frontend', 'src', 'components', 'shell', 'SiteWebShell.css');
    const rule = css.slice(css.indexOf('.site-web-shell__brand-copy strong'));
    expect(rule.slice(0, 200)).toContain('white-space: nowrap');
  });
});

describe('左侧栏「加入我们」', () => {
  const navSrc = read('frontend', 'src', 'components', 'shell', 'siteShellNav.js');

  it('导航项指向 /about/join-us，中英文文案与图标齐备', () => {
    expect(navSrc).toContain("key: 'join-us'");
    expect(navSrc).toContain("labelZh: '加入我们'");
    expect(navSrc).toContain("labelEn: 'Join Us'");
    expect(navSrc).toContain("to: '/about/join-us'");
    expect(navSrc).toContain("matchPrefixes: ['/about/join-us']");
    expect(navSrc).toMatch(/import\s*\{[^}]*HeartHandshake[^}]*\}\s*from 'lucide-react'/);
    expect(navSrc).toContain('icon: HeartHandshake');
  });

  it('排在「跑腿」之后、「我的」之前', () => {
    const errands = navSrc.indexOf("key: 'errands'");
    const join = navSrc.indexOf("key: 'join-us'");
    const myzone = navSrc.indexOf("key: 'myzone'");
    expect(errands).toBeGreaterThan(-1);
    expect(join).toBeGreaterThan(errands);
    expect(myzone).toBeGreaterThan(join);
  });

  it('/about/join-us 路由已注册且是懒加载', () => {
    const routes = read('frontend', 'src', 'routes', 'layoutRoutes.jsx');
    expect(routes).toContain("const JoinUs = lazy(() => import('../pages/JoinUs'));");
    expect(routes).toContain('path="about/join-us" element={renderLazyRoute(JoinUs)}');
  });

  it('页面逐字显示产品给定的招募文案与联系方式', () => {
    const page = read('frontend', 'src', 'pages', 'JoinUs.jsx');
    expect(page).toContain(JOIN_LEAD_ZH);
    expect(page).toContain(`const WECHAT_ID = '${WECHAT_ID}';`);
    expect(page).toContain(`const CONTACT_EMAIL = '${CONTACT_EMAIL}';`);
    expect(page).toContain('{value}');
    expect(page).toContain('加入我们');
  });

  it('联系区同时有微信与邮箱，两个都能复制', () => {
    const page = read('frontend', 'src', 'pages', 'JoinUs.jsx');
    expect(page).toContain("labelZh: '微信'");
    expect(page).toContain("labelZh: '邮箱'");
    expect(page).toContain("labelEn: 'Email'");
    // 邮箱额外做成 mailto 链接，点了能直接发信
    expect(page).toContain('mailto:${CONTACT_EMAIL}');
    // 复制按钮按行记状态，只让刚复制的那行变「已复制」
    expect(page).toContain('useState(null)');
    expect(page).toMatch(/handleCopy\(value\)/);
    expect(page).toContain('copiedValue === value');
  });

  it('侧边栏是通用渲染，新增导航项无需改 SiteSidebar', () => {
    const sidebar = read('frontend', 'src', 'components', 'shell', 'SiteSidebar.jsx');
    expect(sidebar).toContain('SITE_PRIMARY_NAV_ITEMS.map');
    expect(sidebar).toMatch(/label: isZh \? item\.labelZh : item\.labelEn/);
  });
});

/**
 * 微信号统一（2026-09-26 用户裁定：xmumdorm666 是官方号）
 *
 * 背景：站点上曾同时存在两个微信号 —— 老的「联系我们」页（Web / Capacitor App /
 * RN 移动端 About）写的是个人号 YEJIANQIN_git，新加的「加入我们」写的是官方号
 * xmumdorm666。两个号同时对外，用户不知道该加哪个，所以统一到官方号。
 */
describe('微信号全站统一为官方号 xmumdorm666', () => {
  const wechatFiles = [
    ['frontend', 'src', 'pages', 'ContactUs.jsx'],
    ['frontend-app', 'src', 'pages', 'ContactUs.jsx'],
    ['mobile', 'src', 'screens', 'AboutInfoScreen.tsx'],
  ];

  it('三处联系页面都写官方号，都不再出现历史个人号', () => {
    for (const parts of wechatFiles) {
      const src = read(...parts);
      expect(src).toContain(WECHAT_ID);
      expect(src).not.toContain('YEJIANQIN_git');
    }
  });

  it('移动端 About 的联系信息测试读的是真实源码，不是拿常量自比', () => {
    // 原测试写的是 const wechat = 'YEJIANQIN_git'; expect(wechat).toContain('YEJIANQIN');
    // —— 页面改成任何内容它都不会红，等于没测。现在必须出现 readFileSync。
    const spec = read('mobile', '__tests__', 'screens', 'AboutSystem.test.js');
    expect(spec).toContain('readFileSync');
    expect(spec).toContain('AboutInfoScreen.tsx');
  });
});
