// Explicit DEV-only source selection. Production always returns api.
export function squareBannerMode(isDev, search, savedMode = null) {
  if (!isDev) return 'api';
  const requested = new URLSearchParams(search).get('squareBanners');
  if (requested === 'demo' || requested === 'api') return requested;
  return savedMode === 'demo' ? 'demo' : 'api';
}

export const squareBannerDemo = [
  { id: 'demo-square-banner-innovation', type: 'content', title: '轮播演示 · 校园创新', subtitle: '本地演示图片 · 点击查看对应模拟快讯', image_url: '/square/demo/innovation.svg', link_type: 'url', link_target: '/about/campus/preview/demo-news-innovation' },
  { id: 'demo-square-banner-lecture', type: 'content', title: '轮播演示 · 技术分享', subtitle: '本地演示图片 · 点击查看对应模拟快讯', image_url: '/square/demo/lecture.svg', link_type: 'url', link_target: '/about/campus/preview/demo-news-ai' },
  { id: 'demo-square-banner-workshop', type: 'content', title: '轮播演示 · 创意工作坊', subtitle: '本地演示图片 · 点击查看对应模拟快讯', image_url: '/square/demo/workshop.svg', link_type: 'url', link_target: '/about/campus/preview/demo-news-workshop' },
];
