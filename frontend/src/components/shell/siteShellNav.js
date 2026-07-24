import {
  BookOpen,
  Compass,
  HandHeart,
  MessageCircle,
  ShoppingBag,
  UserRound,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react';

export const SITE_PRIMARY_NAV_ITEMS = [
  {
    key: 'square',
    labelZh: '广场',
    labelEn: 'Square',
    to: '/about',
    icon: Compass,
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
    icon: MessageCircle,
    matchPrefixes: ['/post/', '/posts/', '/treehole'],
    exact: true,
  },
  {
    key: 'canteen',
    labelZh: '食堂',
    labelEn: 'Canteen',
    to: '/eat',
    icon: UtensilsCrossed,
    matchPrefixes: ['/eat'],
  },
  {
    key: 'clubs',
    labelZh: '社团',
    labelEn: 'Clubs',
    to: '/about/club',
    icon: UsersRound,
    matchPrefixes: ['/about/club'],
  },
  {
    key: 'marketplace',
    labelZh: '二手',
    labelEn: 'Second Hand',
    to: '/about/second-hand',
    icon: ShoppingBag,
    matchPrefixes: ['/about/second-hand'],
  },
  {
    key: 'freshman-guide',
    labelZh: '新生指南',
    labelEn: 'Guide',
    to: '/about/freshman-guide',
    icon: BookOpen,
    matchPrefixes: ['/about/freshman-guide'],
  },
  {
    key: 'errands',
    labelZh: '跑腿',
    labelEn: 'Errands',
    to: '/about/errands',
    icon: HandHeart,
    matchPrefixes: ['/about/errands'],
  },
  {
    key: 'myzone',
    labelZh: '我的',
    labelEn: 'My Zone',
    to: '/myzone',
    icon: UserRound,
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
