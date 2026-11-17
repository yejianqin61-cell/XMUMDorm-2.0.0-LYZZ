/**
 * 贡献站（任务管理表 #5）：路由、导航、入口都指向站内已有页面
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

describe('贡献站页面接线', () => {
  const routes = read('frontend', 'src', 'routes', 'layoutRoutes.jsx');
  const nav = read('frontend', 'src', 'components', 'shell', 'siteShellNav.js');
  const page = read('frontend', 'src', 'pages', 'Contribute.jsx');
  const backend = read('routes', 'contribute.js');

  it('/about/contribute 已注册且懒加载', () => {
    expect(routes).toContain("const Contribute = lazy(() => import('../pages/Contribute'));");
    expect(routes).toContain('path="about/contribute" element={renderLazyRoute(Contribute)}');
  });

  it('侧边导航有贡献站，排在加入我们之前', () => {
    expect(nav).toContain("key: 'contribute'");
    expect(nav).toContain("to: '/about/contribute'");
    expect(nav.indexOf("key: 'contribute'")).toBeLessThan(nav.indexOf("key: 'join-us'"));
  });

  it('页面里的每个入口都是已注册的路由', () => {
    const targets = [...page.matchAll(/to: '([^']+)'/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThanOrEqual(6);
    for (const to of targets) {
      const routePath = to.replace(/^\//, '');
      expect(routes.includes(`path="${routePath}"`) || routePath === '').toBe(true);
    }
  });

  it('页面的行为文案覆盖后端统计的全部行为', () => {
    const { CONTRIBUTION_ACTIONS } = require('../../routes/contribute');
    for (const action of CONTRIBUTION_ACTIONS) expect(page).toContain(`${action}: [`);
    expect(backend).toContain("u.role = 'student'");
  });
});
