const fs = require('fs');
const path = require('path');

describe('App tab route ownership', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'frontend-app', 'src', 'components', 'TabBar.jsx'),
    'utf8'
  );

  it('keeps every My Zone About route out of the Square tab', () => {
    [
      '/about/profile',
      '/about/algorithm',
      '/about/level-algorithm',
      '/about/disclaimer',
      '/about/schedule',
      '/about/diary',
    ].forEach((route) => expect(source).toContain(`'${route}'`));
    expect(source).toContain('if (MY_ZONE_ABOUT_ROUTES.has(pathname)) return 3;');
  });

  it('不再把已下线的关于子页算作“我的”Tab 归属', () => {
    ['/about/team', '/about/editor-note', '/about/thanks', '/about/contact'].forEach((route) =>
      expect(source).not.toContain(`'${route}'`)
    );
  });
});
