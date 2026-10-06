/**
 * 社团信息页 —— 全校社团联系方式总表（静态维护，不入库）
 * ============================================================
 * 为什么是静态文件而不是数据库表：
 *   生产库 `clubs` 表里只有 2 个社团（DormCommittee、XMUM航空摄影联盟），
 *   和这份名单里的 22 个**零重合**。这 22 个社团绝大多数在 Dorm 上没有账号，
 *   所以没法复用 `clubs` 表；而 22 条、一年改 1~2 次的量级，
 *   一个代码文件 + 一次发版比建表 + 后台 + 接口 + 测试更划算。
 *   （2026-10-06 由所有者裁定：不入库。）
 *
 * 维护方式：
 *   只改下面的 CLUB_DIRECTORY 数组。改完跑 `npx jest __tests__/frontend/clubDirectory.test.js`
 *   —— 里面有一组数据完整性断言（id 唯一、号码全数字、没有把 IG 显示名当 handle 拼链接）。
 *
 * 号码约定（重要）：
 *   `whatsapp[].number` 必须是**纯数字**，含国家码，不带 `+`、空格、横杠，
 *   因为它会被直接拼进 `https://wa.me/<number>`。人类可读的写法放在 `display`。
 */

/** 分类。顺序即前端 chip 的显示顺序 */
export const CLUB_DIRECTORY_CATEGORIES = [
  { key: 'sports', labelZh: '运动', labelEn: 'Sports' },
  { key: 'music', labelZh: '音乐', labelEn: 'Music' },
  { key: 'arts', labelZh: '艺术', labelEn: 'Arts' },
  { key: 'academic', labelZh: '学术商科', labelEn: 'Academic' },
  { key: 'hobby', labelZh: '兴趣', labelEn: 'Hobby' },
  { key: 'culture', labelZh: '文化', labelEn: 'Culture' },
  { key: 'volunteer', labelZh: '志愿', labelEn: 'Volunteer' },
];

/**
 * 22 个社团。字段说明：
 *   mono             缩写块文字（社团都没有 logo，用缩写当扫读锚点）
 *   name             官方全名（保留原文拼写，不缩写）
 *   nameZh           中文名，原文没有就留 null
 *   whatsapp[].name  联系人姓名；原文只给号码时留 null，此时前端显示 display
 *   whatsapp[].role  职位（President / VP…），没有就留 null
 *   instagram        IG handle（不带 @）；原文只给了显示名时留 null
 *   instagramPending 原文给的 IG「显示名」——**不是 handle，不能拼链接**
 *   xiaohongshu      小红书链接
 *   review           俱乐部级的存疑说明；有值 → 前端显示「⚠ 待核实」
 *   whatsapp[].review 号码本身存疑
 */
export const CLUB_DIRECTORY = [
  {
    id: 'aiesec',
    mono: 'AI',
    name: 'AIESEC in XMUM',
    nameZh: null,
    category: 'academic',
    whatsapp: [{ name: null, role: null, number: '60147327720', display: '+60 14-732 7720' }],
    instagram: 'aiesec_xmum',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'xmpo',
    mono: 'XMPO',
    name: 'XMUM Philharmonic Orchestra',
    nameZh: null,
    category: 'music',
    whatsapp: [
      { name: 'Ye Lun', role: null, number: '60175769681', display: '+60 17 576 9681' },
      { name: 'Wei Ning', role: null, number: '601155031393', display: '+60 11 5503 1393' },
      { name: 'Weng Lok', role: null, number: '60174597068', display: '+60 17 459 7068' },
    ],
    instagram: 'xmum_philharmonic',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'football',
    mono: 'FC',
    name: 'Xiamen University Malaysia Football Club',
    nameZh: null,
    category: 'sports',
    whatsapp: [
      { name: 'Nikolai', role: null, number: '60104347831', display: '+60 10-434 7831' },
      { name: 'Dong Yanzhe', role: null, number: '60177957076', display: '+60 17-795 7076' },
    ],
    instagram: 'XMUMFC',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'kendo',
    mono: 'KD',
    name: 'XMUM Kendo Club',
    nameZh: null,
    category: 'sports',
    whatsapp: [{ name: null, role: null, number: '60189841808', display: '+60 18-984 1808' }],
    instagram: 'xmum_kendo',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'badminton',
    mono: 'BDM',
    name: 'XMUM Badminton Club',
    nameZh: null,
    category: 'sports',
    whatsapp: [{ name: 'Sherry', role: null, number: '60176211470', display: '+60 17-621 1470' }],
    instagram: 'xmumbadminton_club',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'boardgame',
    mono: 'BGS',
    name: 'Board Game Society',
    nameZh: null,
    category: 'hobby',
    whatsapp: [{ name: null, role: null, number: '601111004421', display: '+60 11-1100 4421' }],
    instagram: 'xmum_boardgameclub',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'tabletennis',
    mono: 'TT',
    name: 'XMUM Table Tennis Club',
    nameZh: null,
    category: 'sports',
    whatsapp: [{ name: null, role: null, number: '60174011982', display: '+60 17-401 1982' }],
    instagram: 'xmum.tabletennis',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'frisbee',
    mono: 'UF',
    name: 'XMUM Ultimate Frisbee Club',
    nameZh: null,
    category: 'sports',
    whatsapp: [{ name: null, role: null, number: '60165383509', display: '+60 16-538 3509' }],
    instagram: 'xmum_krakens',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'visualart',
    mono: 'VA',
    name: 'Visual Art Club',
    nameZh: null,
    category: 'arts',
    whatsapp: [{ name: null, role: null, number: '60129824134', display: '+60 12-982 4134' }],
    instagram: 'xmumvisualartclub',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'yanan',
    mono: '雅南',
    name: 'Xiamen University Malaysia Yanan Chinese Orchestra',
    nameZh: '厦门大学马校雅南华乐团',
    category: 'music',
    whatsapp: [
      {
        name: 'Sabreena',
        role: null,
        number: '6016411123',
        display: '016-411 123',
        // 马来西亚手机号应为 10~11 位，这个只有 9 位。不猜补，只标记。
        review: '号码只有 9 位，马来西亚手机号应为 10–11 位，疑似漏位',
      },
    ],
    instagram: 'xmum_yco',
    instagramPending: null,
    xiaohongshu: 'https://xhslink.cn/m/42x97Ehhmrn',
    review: 'WhatsApp 号码待核实',
  },
  {
    id: 'dance',
    mono: 'DC',
    name: 'XMUM Dance Club',
    nameZh: null,
    category: 'arts',
    whatsapp: [{ name: null, role: null, number: '601111996732', display: '+60 11-1199 6732' }],
    instagram: 'xmum_danceclub',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'coffee',
    mono: 'CF',
    name: 'XMUM Coffee Club',
    nameZh: 'The Brewix',
    category: 'hobby',
    whatsapp: [{ name: null, role: null, number: '601110809358', display: '+60 11-1080 9358' }],
    instagram: 'xmumcoffeeclub',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'origin',
    mono: 'OIC',
    name: 'Origin Investment Club',
    nameZh: null,
    category: 'academic',
    whatsapp: [
      { name: 'Leong Yew Hoong', role: 'President', number: '60173278793', display: '+60 17-327 8793' },
      { name: 'Sherly Patricia Salim', role: 'VP', number: '62895392153888', display: '+62 895 3921 53888' },
      { name: 'Marina Novina Putri Bellina', role: 'Secretary', number: '60143648226', display: '+60 14-364 8226' },
    ],
    instagram: 'xmumoic',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'muslim',
    mono: 'MS',
    name: 'Muslim Society XMUM',
    nameZh: null,
    category: 'culture',
    whatsapp: [
      { name: 'Faisal Fareed Bukhari', role: null, number: '923457080076', display: '+92 345 7080076' },
    ],
    instagram: 'xmum.muslims',
    instagramPending: null,
    xiaohongshu: null,
    // 原文自己标注了 Former President，可能已经换届
    review: '原文标注联系人为「Former President」，可能已换届',
  },
  {
    id: 'arttroupe',
    mono: 'SA',
    name: 'XMUM Student Art Troupe',
    nameZh: null,
    category: 'arts',
    whatsapp: [{ name: null, role: null, number: '60125925613', display: '+60 12-592 5613' }],
    instagram: 'xmum_student.arttroupe',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'acrux',
    mono: 'AC',
    name: 'Acrux Cheerleading Club',
    nameZh: null,
    category: 'sports',
    whatsapp: [{ name: null, role: null, number: '60122290327', display: '+60 12-229 0327' }],
    instagram: 'xmum_acrux',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'drums24',
    mono: '24',
    name: 'XMUM 24 Festive Drums Club',
    nameZh: null,
    category: 'music',
    whatsapp: [{ name: 'Nichole', role: null, number: '60105599692', display: '+60 10-559 9692' }],
    instagram: 'xmum24fd',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'diabolo',
    mono: 'DB',
    name: 'Xiamen University Malaysia Diabolo Club',
    nameZh: null,
    category: 'culture',
    whatsapp: [{ name: 'Ng Wu Chuan', role: null, number: '60179910306', display: '+60 17-991 0306' }],
    instagram: null,
    // 原文只给了「Xmum Diabolo Club」这个页面显示名，不是账号 handle。
    // 拿它拼 instagram.com/xxx 会 404，所以只显示「待确认」。
    instagramPending: 'Xmum Diabolo Club',
    xiaohongshu: null,
    review: 'Instagram 待确认',
  },
  {
    id: 'fitness',
    mono: 'FT',
    name: 'XMUM Fitness Club',
    nameZh: null,
    category: 'sports',
    whatsapp: [{ name: 'Hugo', role: null, number: '60103865789', display: '+60 10-386 5789' }],
    instagram: null,
    instagramPending: 'Xmum Fitness | Gym Club',
    xiaohongshu: null,
    review: 'Instagram 待确认',
  },
  {
    id: 'speakt',
    mono: 'ST',
    name: 'XMUM Speak-T Society',
    nameZh: null,
    category: 'academic',
    whatsapp: [{ name: 'Chiam Hui Yu', role: null, number: '60162604567', display: '+60 16-260 4567' }],
    instagram: 'xmum_speaktsociety',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'yoga',
    mono: 'YG',
    name: 'XMUM Yoga Club',
    nameZh: null,
    category: 'sports',
    whatsapp: [
      { name: 'Teo Ai Wern', role: null, number: '60122884929', display: '+60 12-288 4929' },
      { name: 'Tan Yinxin', role: null, number: '601159783302', display: '+60 11-5978 3302' },
      { name: 'Loh Ying Li', role: null, number: '60102150921', display: '+60 10-215 0921' },
    ],
    instagram: 'xmum_yogaclub',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
  {
    id: 'leo',
    mono: 'OL',
    name: 'XMUM Omega Leo Club',
    nameZh: null,
    category: 'volunteer',
    whatsapp: [{ name: 'Teoh Sze Thou', role: null, number: '60124533539', display: '+60 12-453 3539' }],
    instagram: 'omegaleo_xmum',
    instagramPending: null,
    xiaohongshu: null,
    review: null,
  },
];

/** WhatsApp 深链。number 必须是纯数字（见文件头约定） */
export function whatsappLink(number) {
  return `https://wa.me/${number}`;
}

/** Instagram 主页。handle 不带 @ */
export function instagramLink(handle) {
  return `https://instagram.com/${handle}`;
}

/** 按 key 取分类；取不到返回 null（前端据此跳过渲染，避免出现空 chip） */
export function findClubCategory(key) {
  return CLUB_DIRECTORY_CATEGORIES.find((c) => c.key === key) || null;
}

/** 每个分类下有几个社团，用于 chip 上的数字 */
export function clubCategoryCounts() {
  const counts = {};
  for (const c of CLUB_DIRECTORY) {
    counts[c.category] = (counts[c.category] || 0) + 1;
  }
  return counts;
}

/** 某个社团在搜索时要匹配的全部文本（小写） */
export function clubSearchText(club) {
  return [
    club.name,
    club.nameZh,
    club.mono,
    club.instagram,
    club.instagramPending,
    ...(club.whatsapp || []).flatMap((w) => [w.name, w.role, w.number, w.display]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
