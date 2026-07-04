/**
 * Page title maps and resolution logic.
 * Extracted from Layout.jsx to keep the layout component focused on rendering.
 */

export const TITLE_BY_PATH_ZH = {
  '/': '厦马小筑',
  '/eat': '食堂',
  '/about': '广场',
  '/myzone': '我的',
  '/mailbox': '信箱',
  '/post/new': '发布帖子',
  '/myzone/posts': '我的帖子',
  '/myzone/reviews': '我的点评',
  '/myzone/profile': '修改资料',
  '/about/algorithm': '评分算法说明',
  '/about/level-algorithm': '等级算法说明',
  '/about/profile': '关于我们',
  '/about/campus': '今日校园',
  '/myzone/schedule': '课程表',
  '/myzone/diary': '多年日记本',
  '/eat/search': '搜索',
  '/eat/map': '食堂地图',
  '/eat/banners': '轮播管理',
  '/about/trending': '热搜榜',
};

export const TITLE_BY_PATH_EN = {
  '/': 'XMUM Dorm',
  '/eat': 'Canteen',
  '/about': 'Square',
  '/myzone': 'My Zone',
  '/mailbox': 'Mailbox',
  '/post/new': 'Post',
  '/myzone/posts': 'My Posts',
  '/myzone/reviews': 'My Reviews',
  '/myzone/profile': 'Profile',
  '/about/algorithm': 'Scoring Algorithm',
  '/about/level-algorithm': 'Level System',
  '/about/profile': 'About us',
  '/about/campus': 'Campus Updates',
  '/myzone/schedule': 'Schedule',
  '/myzone/diary': 'Diary',
  '/eat/search': 'Search',
  '/eat/map': 'Canteen Map',
  '/eat/banners': 'Carousel',
  '/about/trending': 'Trending',
};

/**
 * Resolve a display title from the current pathname and locale.
 * Uses exact-match map lookup first, then pattern-based fallback.
 */
export function resolvePageTitle(pathname, isZh) {
  const map = isZh ? TITLE_BY_PATH_ZH : TITLE_BY_PATH_EN;
  const exact = map[pathname];
  if (exact) return exact;

  if (pathname.startsWith('/eat/food/') && pathname.endsWith('/review')) {
    return isZh ? '发布点评' : 'Publish Review';
  }
  if (pathname === '/eat/rankings') {
    return isZh ? '排行榜' : 'Rankings';
  }
  if (/\/eat\/[^/]+\/ranking\/?$/.test(pathname)) {
    const seg = pathname.split('/')[2];
    const code = seg ? decodeURIComponent(seg) : '';
    return isZh ? `${code || '分区'} 商品榜` : `${code || 'Area'} · Top foods`;
  }
  if (
    pathname.startsWith('/eat/') &&
    !pathname.startsWith('/eat/merchant') &&
    !pathname.startsWith('/eat/food') &&
    pathname !== '/eat/rankings'
  ) {
    const seg = pathname.split('/')[2];
    const codeLabel = seg ? decodeURIComponent(seg) : '';
    return codeLabel ? (isZh ? codeLabel : `${codeLabel} · Merchants`) : (isZh ? '食堂' : 'Canteen');
  }
  if (pathname.startsWith('/eat')) {
    return isZh ? '食堂' : 'Canteen';
  }
  if (pathname.startsWith('/mailbox')) {
    return isZh ? '信箱' : 'Mailbox';
  }
  if (pathname === '/post/new') {
    return isZh ? '发布帖子' : 'Post';
  }
  if (pathname.startsWith('/posts/search')) {
    return isZh ? '搜索帖子' : 'Search posts';
  }
  if (pathname.startsWith('/posts/tag/')) {
    return isZh ? '话题帖子' : 'Posts by tag';
  }
  if (pathname.startsWith('/post/')) {
    return isZh ? '帖子详情' : 'Post';
  }
  if (pathname === '/myzone/posts') {
    return isZh ? '我的帖子' : 'My Posts';
  }
  if (pathname === '/myzone/reviews') {
    return isZh ? '我的点评' : 'My Reviews';
  }
  if (pathname === '/myzone/profile') {
    return isZh ? '修改资料' : 'Profile';
  }
  if (pathname === '/merchant/create') {
    return isZh ? '店铺创建' : 'Create Store';
  }
  if (pathname === '/merchant/manage') {
    return isZh ? '菜品管理' : 'Manage Food';
  }
  if (pathname === '/merchant/food/new') {
    return isZh ? '菜品发布' : 'Publish Food';
  }
  if (pathname.startsWith('/merchant/food/')) {
    return isZh ? '菜品详情' : 'Food Detail';
  }
  if (pathname.startsWith('/merchant/')) {
    return isZh ? '商家' : 'Merchant';
  }
  if (pathname === '/about/thanks') {
    return isZh ? '特别鸣谢' : 'Special Thanks';
  }
  if (pathname === '/about/team') {
    return isZh ? '团队介绍' : 'Team';
  }
  if (pathname === '/about/editor-note') {
    return isZh ? '编者的话' : "Editor's Note";
  }
  if (pathname === '/about/algorithm') {
    return isZh ? '评分算法说明' : 'Scoring Algorithm';
  }
  if (pathname === '/about/level-algorithm') {
    return isZh ? '等级算法说明' : 'Level System';
  }
  if (pathname.startsWith('/about/trending/') && pathname.endsWith('/new')) {
    return isZh ? '参与讨论' : 'Join Discussion';
  }
  if (pathname.startsWith('/about/trending/')) {
    return isZh ? '热搜详情' : 'Trending';
  }
  if (pathname === '/about/campus/new') {
    return isZh ? '发布校园通知' : 'Campus Post';
  }
  if (pathname.startsWith('/about/campus/')) {
    return isZh ? '校园通知' : 'Campus Notice';
  }
  if (pathname === '/about/admin/orgs') {
    return isZh ? '组织管理' : 'Org Admin';
  }
  if (pathname === '/about/map') {
    return isZh ? '广场地图' : 'Square Map';
  }

  return isZh ? '厦马小筑' : 'XMUM Dorm';
}
