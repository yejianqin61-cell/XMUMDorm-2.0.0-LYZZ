import { toCampusNewsViewModel } from './campusNewsModel.js';

const poster = (name, alt) => ({ src: `/square/demo/${name}.svg`, alt });

/** Fictional content, never passed to a real detail route or write API. */
export const campusNewsDemo = [
  {
    id: 'demo-news-innovation', category: 'competition', audience: { scope: 'all', collegeCodes: [] }, title: '把一个好想法，变成校园里的下一种可能',
    content: '校园创新挑战赛 · 创意征集演示\n从更环保的宿舍，到更便利的校园服务，邀请你用一个小小的原型回答真实的问题。\n本示例设有创意、技术与社会创新 3 个方向，每队 2–4 人，跨专业组队也欢迎。\n此为界面演示，不代表实际赛事或报名安排。',
    images: [poster('innovation', '演示海报：Campus ideas，校园创新挑战')],
    createdAt: '2026-10-23T12:20:00+08:00', likeCount: 24, commentCount: 8, favoriteCount: 12,
  },
  {
    id: 'demo-news-ai', category: 'lecture', audience: { scope: 'colleges', collegeCodes: ['computing'] }, title: '从课堂到真实世界：AI 能为我们做什么？',
    content: 'AI beyond the classroom\n一场面向所有专业的技术分享：从一个问题出发，认识模型、数据与人的判断。\n演示时间为 19:00，地点与报名方式均为示意。\n更多内容将在详情中完整显示，欢迎试试打开预览。',
    images: [poster('lecture', '演示海报：AI beyond the classroom'), poster('workshop', '演示海报：一起动手，让想法发生')],
    createdAt: '2026-10-23T10:05:00+08:00', likeCount: 68, commentCount: 16, favoriteCount: 35,
  },
  {
    id: 'demo-news-water', category: 'campus-life', audience: { scope: 'all', collegeCodes: [] }, title: '宿舍供水维护提醒（演示）',
    content: '以下内容仅用于测试通知排版，并非真实停水安排。\n示例：部分楼栋于 10:00–12:00 进行设施维护，请提前安排用水。\n实际通知请以学校正式渠道为准。',
    images: [], createdAt: '2026-10-23T08:30:00+08:00', likeCount: 19, commentCount: 3, favoriteCount: 6,
  },
  {
    id: 'demo-news-design', category: 'competition', audience: { scope: 'all', collegeCodes: [] }, title: 'Design for campus · 跨学科设计挑战与作品交流展示报名说明（演示）',
    content: '用设计记录你眼中的校园。\n这里用三张演示海报展示多图排版，所有内容均为虚构。\n从观察、讨论到制作，给平常的校园生活一个新的视角。\n示例长网址不会撑开布局：https://example.invalid/campus/DesignForCampus2026InterdisciplinaryCreativeChallengeRegistrationAndSubmissionGuide',
    images: [poster('workshop', '演示海报：创意工作坊'), poster('innovation', '演示海报：校园创新'), poster('lecture', '演示海报：技术分享')],
    createdAt: '2026-10-22T17:15:00+08:00', likeCount: 105, commentCount: 21, favoriteCount: 49,
  },
  {
    id: 'demo-news-reading', category: 'lecture', audience: { scope: 'colleges', collegeCodes: ['computing'] }, title: '午后读书会：带来一本你喜欢的书',
    content: '从一本书开始一段对话。Reading together, thinking differently.（演示）',
    images: [], createdAt: '2026-10-22T14:00:00+08:00', likeCount: 7, commentCount: 0, favoriteCount: 9,
  },
  {
    id: 'demo-news-workshop', category: 'campus-life', audience: { scope: 'all', collegeCodes: [] }, title: '让旧物重新出发 · 校园手作日',
    content: '一张纸、一只旧盒子，也可以成为新的作品。\n本卡片用于演示十张图片的横向浏览，图片内容为本地演示海报，不是真实活动通知。',
    images: Array.from({ length: 10 }, (_, i) => poster(['workshop', 'innovation', 'lecture'][i % 3], `校园活动演示图 ${i + 1} / 10`)),
    createdAt: '2026-10-22T11:40:00+08:00', likeCount: 36, commentCount: 5, favoriteCount: 18,
  },
  {
    id: 'demo-news-code', category: 'competition', audience: { scope: 'all', collegeCodes: [] }, title: 'Code together / 校园编程挑战',
    content: 'Hello, campus! 用 48 小时把想法变成可以运行的作品。\nPython、JavaScript 或你熟悉的语言，都可以是起点。\n这是一条演示内容，展示中英混排和数字信息。',
    images: [], createdAt: '2026-10-21T18:00:00+08:00', likeCount: 1280, commentCount: 42, favoriteCount: 106,
  },
  {
    id: 'demo-news-image-failure', category: 'campus-life', audience: { scope: 'all', collegeCodes: [] }, title: '校园步道维护说明（图片降级演示）',
    content: '这条演示故意使用不可用图片，检查加载失败时是否仍能阅读正文、打开详情。\n它不代表真实道路封闭或维护安排。',
    images: [{ src: '/square/demo/intentionally-unavailable.webp', alt: '演示维护示意图' }],
    createdAt: '2026-10-21T09:10:00+08:00', likeCount: 0, commentCount: 2, favoriteCount: 1,
  },
].map(toCampusNewsViewModel);

export function findCampusNewsPreview(id) {
  return campusNewsDemo.find((post) => post.id === id) ?? null;
}
