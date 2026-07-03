/** 测试评论/回复数据，按帖子 id 分组，后续可替换为接口 */
export const MOCK_COMMENTS_BY_POST = {
  1: [
    { id: 101, content: '同感！D6 炒饭真的好吃', replyTo: null, likeCount: 2 },
    { id: 102, content: '明天去试试', replyTo: null, likeCount: 0 },
    { id: 103, content: '我也觉得！', replyTo: 101, likeCount: 1 },
  ],
  2: [
    { id: 201, content: '我可以！几点？', replyTo: null, likeCount: 1 },
    { id: 202, content: '12 点 LY3 门口见', replyTo: 201, likeCount: 0 },
  ],
  3: [
    { id: 301, content: '去过了，珍珠很 Q', replyTo: null, likeCount: 5 },
  ],
  4: [
    { id: 401, content: '树洞+1，加油', replyTo: null, likeCount: 3 },
  ],
  5: [
    { id: 501, content: '拍得好好看', replyTo: null, likeCount: 8 },
  ],
  6: [
    { id: 601, content: '阿姨人超好', replyTo: null, likeCount: 4 },
  ],
  7: [
    { id: 701, content: 'BELL 楼下那家面不错', replyTo: null, likeCount: 2 },
  ],
};

/** 获取某帖子的评论列表（含回复平铺，replyTo 表示回复哪条） */
export function getCommentsForPost(postId) {
  return MOCK_COMMENTS_BY_POST[postId] || [];
}
