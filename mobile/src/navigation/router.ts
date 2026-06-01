/**
 * 简易页面路由（替代 expo-router）
 * 因为 expo-router 和 registerRootComponent 冲突，
 * 用这个简单方案管理 Modal 页面切换。
 */

type RouteListener = (route: string) => void;
const listeners: RouteListener[] = [];

export const router = {
  navigate(route: string) {
    listeners.forEach((fn) => fn(route));
  },
  back() {
    listeners.forEach((fn) => fn('BACK'));
  },
  subscribe(fn: RouteListener) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },
};
