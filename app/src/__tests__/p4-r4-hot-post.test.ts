/**
 * 第四轮 R4-17：今日页热帖按「评论×2 + 赞」挑一条。
 */
import { pickHotPost } from '@/features/square/HotPostCard';
import type { TreeholePostViewModel } from '@/features/campus/treeholePostViewModel';

jest.mock('expo-router', () => ({ useRouter: () => ({}) }));

const post = (id: number, likeCount: number, commentCount: number) => ({ id, likeCount, commentCount }) as TreeholePostViewModel;

describe('R4-17 · 热帖', () => {
  it('评论权重是赞的两倍；空列表返回 null', () => {
    expect(pickHotPost([post(1, 5, 0), post(2, 0, 3), post(3, 1, 1)])?.id).toBe(2);
    expect(pickHotPost([])).toBeNull();
  });
});
