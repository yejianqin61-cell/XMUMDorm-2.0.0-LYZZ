/** 信箱提醒：匿名发帖后，别人点赞/评论会在这里收到提醒。后续可替换为接口 */
import { MOCK_POSTS } from './mockPosts';

export const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'like', postId: 5, time: '2 分钟前', count: 3 },
  { id: 2, type: 'comment', postId: 4, time: '15 分钟前', preview: '树洞+1，加油' },
  { id: 3, type: 'like', postId: 17, time: '1 小时前', count: 12 },
  { id: 4, type: 'comment', postId: 7, time: '昨天 18:30', preview: 'BELL 楼下那家面不错' },
  { id: 5, type: 'comment', postId: 2, time: '昨天 12:00', preview: '12 点 LY3 门口见' },
];

export function getPostPreview(postId, maxLen = 28) {
  const post = MOCK_POSTS.find((p) => p.id === postId);
  if (!post) return '你的帖子';
  const t = post.content.replace(/\s+/g, ' ').trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen) + '…';
}
