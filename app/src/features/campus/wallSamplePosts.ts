/**
 * 阶段 2 节点 A 的**静态示例帖**（8 条，仅用于视觉验收）
 *
 * 三条硬规则：
 *   1. **不写库、不发请求**：全部是模块常量，示例数据永远不进真实数据库；
 *   2. **界面必须标「示例」**：信息流顶部有说明条；
 *   3. 阶段 2-B 接入真实自由帖发布后，本文件整体删除（`WallSampleBand` 不再被引用）。
 *
 * 覆盖形状：短中文 / 中英混排 / 中等中文 / 英文 / Emoji / 多段落 / 简短招募 / 较长招募，
 * 使用固定的布局与底色组合，便于在同一条信息流里比较。
 */

import type { WallPost } from './wallPost';

const NOW = Date.now();

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

/** 示例帖 id 取 900001+ 保留段：既与真实自增 id 区分，也让 testID 可读 */
export const WALL_SAMPLE_POSTS: readonly WallPost[] = [
  {
    id: 900001,
    kind: 'free',
    content: '有没有人知道学校哪里最适合自习？',
    posterStyle: { version: 2, layoutId: 'emphasis', colorId: 'mist' },
    createdAt: minutesAgo(5),
    likeCount: 12,
    commentCount: 4,
    sample: true,
  },
  {
    id: 900002,
    kind: 'recruit',
    content: '',
    createdAt: minutesAgo(38),
    likeCount: 6,
    commentCount: 2,
    sample: true,
    recruit: {
      title: '羽毛球双打缺一人',
      description: '周三晚上打两小时，水平不限，自备球拍。',
      headcount: '3/4',
      time: '周三 19:00',
      place: '体育馆 3 号场',
      status: 'open',
    },
  },
  {
    id: 900003,
    kind: 'free',
    content:
      'A3 的通宵自习室这周还开吗？\n有人说 Final 周会延长到凌晨两点，也有人说不开放。Any update would be great — 想提前安排复习时间。',
    posterStyle: { version: 2, layoutId: 'natural', colorId: 'sage' },
    createdAt: minutesAgo(95),
    likeCount: 3,
    commentCount: 1,
    sample: true,
  },
  {
    id: 900004,
    kind: 'free',
    content:
      '想问问大家，期末周的打印店一般要排多久队？\n昨天下午在 B1 打印课程报告，等了差不多四十分钟，前面还有十几个人。\n如果换成早上八点去会不会好一点？还是说图书馆负一楼那家更快？谢谢！如果最近有人去过，能不能顺便说一下哪一家可以自己带纸？我想一次把两门课的资料都印好。',
    posterStyle: { version: 2, layoutId: 'natural', colorId: 'khaki' },
    createdAt: minutesAgo(260),
    likeCount: 21,
    commentCount: 8,
    sample: true,
  },
  {
    id: 900005,
    kind: 'recruit',
    content: '',
    createdAt: minutesAgo(1560),
    likeCount: 9,
    commentCount: 5,
    sample: true,
    recruit: {
      title: '摄影社外拍招募：布城老城区扫街',
      description:
        '周六下午去布城老城区扫街，回校后一起选片。需要两位同学帮忙拿器材，也欢迎只想跟着走走看看的同学，不需要摄影基础。',
      headcount: '6/12',
      time: '周六 14:00–18:00',
      place: '校门口集合，统一出发',
      status: 'open',
    },
  },
  {
    id: 900006,
    kind: 'free',
    content: '宿舍楼下的自助洗衣机好像又坏了，投币之后一直停在 3 分钟不动。有人知道报修电话吗？',
    posterStyle: { version: 2, layoutId: 'natural', colorId: 'teal' },
    createdAt: minutesAgo(2880),
    likeCount: 0,
    commentCount: 0,
    sample: true,
  },
  {
    id: 900007,
    kind: 'free',
    content: 'Anyone up for a slow run around the lake tonight?',
    posterStyle: { version: 2, layoutId: 'quote', colorId: 'slate' },
    createdAt: minutesAgo(4200),
    likeCount: 7,
    commentCount: 2,
    sample: true,
  },
  {
    id: 900008,
    kind: 'free',
    content:
      '搬进新宿舍的第一周。\n\n阳台下午有很长一段阳光，晒被子刚刚好 🌤️\n\n唯一的问题是水压，洗澡要等一会儿。',
    posterStyle: { version: 2, layoutId: 'natural', colorId: 'teal' },
    createdAt: minutesAgo(5600),
    likeCount: 4,
    commentCount: 1,
    sample: true,
  },
];
