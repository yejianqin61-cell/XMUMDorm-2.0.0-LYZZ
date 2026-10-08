
export function getTabIndex(pathname) {
  if (pathname.startsWith('/myzone')) return 3;
  if (pathname.startsWith('/eat')) return 2;
  if (pathname === '/' || pathname.startsWith('/post') || pathname.startsWith('/treehole')) return 1;
  if (pathname.startsWith('/about')) return 0;
  return 0;
}
export const TAB_ROOT_PATHS = ['/about', '/', '/eat', '/myzone'];
export function getTabRootPath(pathname) {
  if (pathname.startsWith('/myzone')) return '/myzone';
  if (pathname.startsWith('/about')) return '/about';
  if (pathname.startsWith('/eat')) return '/eat';
  if (pathname === '/' || pathname.startsWith('/post') || pathname.startsWith('/treehole')) return '/';
  return pathname;
}
