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
      '/about/team',
      '/about/editor-note',
      '/about/algorithm',
      '/about/level-algorithm',
      '/about/thanks',
      '/about/disclaimer',
      '/about/contact',
    ].forEach((route) => expect(source).toContain(`'${route}'`));
    expect(source).toContain('if (MY_ZONE_ABOUT_ROUTES.has(pathname)) return 3;');
  });
});
