export const SITE_PRIMARY_NAV_ITEMS = [
  {
    key: 'square',
    labelZh: '广场',
    labelEn: 'Square',
    to: '/about',
    accent: 'var(--accent-square)',
    matchPrefixes: [
      '/about/map',
      '/about/thanks',
      '/about/profile',
      '/about/team',
      '/about/editor-note',
      '/about/algorithm',
      '/about/level-algorithm',
      '/about/campus',
      '/about/trending',
      '/about/admin/orgs',
    ],
    exact: true,
  },
  {
    key: 'treehole',
    labelZh: '树洞',
    labelEn: 'TreeHole',
    to: '/',
    accent: 'var(--accent-treehole)',
    matchPrefixes: ['/post/', '/posts/', '/treehole'],
    exact: true,
  },
  {
    key: 'canteen',
    labelZh: '食堂',
    labelEn: 'Canteen',
    to: '/eat',
    accent: 'var(--accent-canteen)',
    matchPrefixes: ['/eat'],
  },
  {
    key: 'clubs',
    labelZh: '社团',
    labelEn: 'Clubs',
    to: '/about/club',
    accent: 'var(--accent-club)',
    matchPrefixes: ['/about/club'],
  },
  {
    key: 'marketplace',
    labelZh: '二手',
    labelEn: 'Second Hand',
    to: '/about/second-hand',
    accent: 'var(--accent-marketplace)',
    matchPrefixes: ['/about/second-hand'],
  },
  {
    key: 'freshman-guide',
    labelZh: '新生指南',
    labelEn: 'Guide',
    to: '/about/freshman-guide',
    accent: 'var(--color-mint-400)',
    matchPrefixes: ['/about/freshman-guide'],
  },
  {
    key: 'errands',
    labelZh: '跑腿',
    labelEn: 'Errands',
    to: '/about/errands',
    accent: 'var(--color-pink-400)',
    matchPrefixes: ['/about/errands'],
  },
  {
    key: 'myzone',
    labelZh: '我的',
    labelEn: 'My Zone',
    to: '/myzone',
    accent: 'var(--color-brand-primary)',
    matchPrefixes: ['/myzone'],
  },
];

export function isSiteNavActive(pathname, item) {
  if (!pathname || !item) return false;

  if (item.to === '/' && pathname === '/') {
    return true;
  }

  if (Array.isArray(item.matchPrefixes) && item.matchPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  if (item.exact) {
    return pathname === item.to;
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
