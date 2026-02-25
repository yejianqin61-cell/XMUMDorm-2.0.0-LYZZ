/** 测试帖子数据（25 条），含 authorId 用于「我的帖子」；后续可替换为接口 */
export const MOCK_POSTS = [
  { id: 1, authorId: 1, content: '今天食堂的炒饭绝了！强烈推荐 D6 那家。Today\'s fried rice at canteen was amazing!', likeCount: 12, commentCount: 3 },
  { id: 2, authorId: 2, content: '有没有人一起约 LY3 吃午饭？Anyone for lunch at LY3?', likeCount: 5, commentCount: 8 },
  { id: 3, authorId: 1, content: 'B1 新开了一家奶茶，大家去过了吗？New bubble tea at B1, anyone tried?', likeCount: 28, commentCount: 15 },
  { id: 4, authorId: 2, content: '期末复习中，厦马小筑陪我。Finals revision, XMUM Dorm keeps me company.', likeCount: 99, commentCount: 22 },
  { id: 5, authorId: 1, content: '分享一张校园夕阳。Sharing a campus sunset.', likeCount: 156, commentCount: 41 },
  { id: 6, authorId: 2, content: '食堂阿姨今天多给了我一勺菜！Lunch auntie gave me an extra scoop today!', likeCount: 67, commentCount: 12 },
  { id: 7, authorId: 1, content: '求推荐 BELL 附近好吃的。Any good food near BELL?', likeCount: 23, commentCount: 19 },
  { id: 8, authorId: 2, content: '周末有人打球吗？Anyone playing ball this weekend?', likeCount: 8, commentCount: 5 },
  { id: 9, authorId: 1, content: '马来西亚的椰浆饭 yyds。Nasi lemak is the best.', likeCount: 88, commentCount: 33 },
  { id: 10, authorId: 2, content: '在图书馆呆了一整天，出来透透气。Been in the library all day, taking a break.', likeCount: 34, commentCount: 7 },
  { id: 11, authorId: 1, content: '新生报到！有没有学长学姐带带。New student here! Seniors please help.', likeCount: 45, commentCount: 28 },
  { id: 12, authorId: 2, content: '今天天气真好呀。Such nice weather today.', likeCount: 19, commentCount: 4 },
  { id: 13, authorId: 1, content: '食堂排队好长，建议大家错峰。Long queue at canteen, try off-peak hours.', likeCount: 52, commentCount: 11 },
  { id: 14, authorId: 2, content: '分享一个学习小组，欢迎加入。Study group open, welcome to join.', likeCount: 71, commentCount: 36 },
  { id: 15, authorId: 1, content: 'other 区那家面馆不错。The noodle shop at other area is good.', likeCount: 14, commentCount: 9 },
  { id: 16, authorId: 2, content: '有没有一起备考 IELTS 的？Any IELTS study buddies?', likeCount: 62, commentCount: 44 },
  { id: 17, authorId: 1, content: '校园猫猫出没！Campus cat spotted!', likeCount: 203, commentCount: 67 },
  { id: 18, authorId: 2, content: '感谢今天帮我捡到学生证的同学。Thanks to whoever returned my student ID.', likeCount: 38, commentCount: 6 },
  { id: 19, authorId: 1, content: '明天有雨，记得带伞。Rain tomorrow, bring an umbrella.', likeCount: 27, commentCount: 2 },
  { id: 20, authorId: 2, content: '毕业倒计时 100 天。100 days to graduation.', likeCount: 112, commentCount: 58 },
  { id: 21, authorId: 1, content: '有没有人知道 LY4 自习室几点关门？When does LY4 study room close?', likeCount: 31, commentCount: 9 },
  { id: 22, authorId: 2, content: '推荐一下校园里适合拍照的地方。Best photo spots on campus?', likeCount: 44, commentCount: 18 },
  { id: 23, authorId: 1, content: '今天在 D5 捡到一个黑色钱包，失主请联系。Found a black wallet at D5, owner please contact.', likeCount: 89, commentCount: 12 },
  { id: 24, authorId: 2, content: '想找一起晨跑的小伙伴。Looking for morning jogging buddies.', likeCount: 26, commentCount: 15 },
  { id: 25, authorId: 1, content: '厦马小筑晚安，明天考试加油。Goodnight XMUM Dorm, good luck with exams tomorrow.', likeCount: 167, commentCount: 42 },
];

/** 按用户 id 筛选「我的帖子」；后续可改为接口 */
export function getPostsByAuthorId(authorId) {
  if (!authorId) return [];
  return MOCK_POSTS.filter((p) => p.authorId === authorId);
}

/**  mock 作者信息（id -> 用户名、头像），后续可改为接口 */
export const MOCK_AUTHORS = {
  1: { username: '用户一 UserOne', avatar: null },
  2: { username: '用户二 UserTwo', avatar: null },
};

export function getAuthor(authorId) {
  return MOCK_AUTHORS[authorId] || { username: '匿名 Anonymous', avatar: null };
}
