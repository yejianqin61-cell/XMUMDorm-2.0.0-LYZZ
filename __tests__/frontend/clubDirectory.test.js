/**
 * 社团信息页 回归测试
 *
 * 背景：社团信息页（/about/club/directory）把全校 22 个社团的联系方式集中一页。
 * 数据是**静态文件** shared/config/clubDirectory.js（不入库），
 * 由人工从一份格式很乱的名单里整理出来 —— 也就是说**手抄错误是这个功能最大的风险**。
 *
 * 所以这里测两类东西：
 *   1. 数据完整性：号码能不能拼成可用的 wa.me 链接、有没有把「IG 显示名」当成 handle
 *   2. 页面不会把不确定的数据伪造成可点的链接（这是这一页最容易做砸的地方）
 *
 * 断言风格：把「违规项」收集成数组再和 `[]` 比 —— 失败时 jest 会直接把出问题的
 * 那条数据打出来，比 expect(true).toBe(false) 有用得多。
 */
const fs = require('fs');
const path = require('path');

const {
  CLUB_DIRECTORY,
  clubCategoryCounts,
  clubSearchText,
  findClubCategory,
  instagramLink,
  whatsappLink,
} = require('../../shared/config/clubDirectory');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');

const PAGE = ['frontend', 'src', 'pages', 'Clubs', 'ClubDirectoryPage.jsx'];
const pageSrc = read(...PAGE);

/** 展平成 [{ club, w }]，方便逐个断言号码 */
const allWhatsapp = CLUB_DIRECTORY.flatMap((c) => c.whatsapp.map((w) => ({ club: c, w })));
/** 把违规项格式化成可读字符串，方便看失败原因 */
const label = ({ club, w }) => `${club.id}: ${w.number} (${w.number.length} 位, ${w.display})`;

describe('社团信息页 — 数据完整性', () => {
  it('一共 22 个社团', () => {
    expect(CLUB_DIRECTORY).toHaveLength(22);
  });

  it('id 唯一', () => {
    const ids = CLUB_DIRECTORY.map((c) => c.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dup).toEqual([]);
  });

  it('缩写块唯一（缩写是这一页唯一的扫读锚点，重复会认错社团）', () => {
    const monos = CLUB_DIRECTORY.map((c) => c.mono);
    const dup = monos.filter((m, i) => monos.indexOf(m) !== i);
    expect(dup).toEqual([]);
  });

  it('每个社团的分类 key 都能解析（写错会渲染出一个没有分类标签的行）', () => {
    const bad = CLUB_DIRECTORY.filter((c) => !findClubCategory(c.category)).map((c) => `${c.id}: ${c.category}`);
    expect(bad).toEqual([]);
  });

  it('分类计数之和等于社团总数', () => {
    const counts = clubCategoryCounts();
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(CLUB_DIRECTORY.length);
  });

  it('每个社团至少有一个可联系的渠道', () => {
    const bad = CLUB_DIRECTORY.filter(
      (c) => c.whatsapp.length === 0 && !c.instagram && !c.instagramPending && !c.xiaohongshu,
    ).map((c) => c.id);
    expect(bad).toEqual([]);
  });

  it('每个社团都有非空全名', () => {
    const bad = CLUB_DIRECTORY.filter((c) => !c.name || !c.name.trim()).map((c) => c.id);
    expect(bad).toEqual([]);
  });
});

describe('社团信息页 — 号码必须能拼成 wa.me 链接', () => {
  it('号码全是纯数字（带 +、空格、横杠都会让 wa.me 打不开）', () => {
    const bad = allWhatsapp.filter(({ w }) => /[^0-9]/.test(String(w.number))).map(label);
    expect(bad).toEqual([]);
  });

  it('号码长度在 10–15 位之间（E.164 上限 15）', () => {
    const bad = allWhatsapp.filter(({ w }) => w.number.length < 10 || w.number.length > 15).map(label);
    expect(bad).toEqual([]);
  });

  it('不足 11 位的号码必须被标记待核实（不静默放过疑似漏位的号）', () => {
    const bad = allWhatsapp.filter(({ w }) => w.number.length < 11 && !w.review).map(label);
    expect(bad).toEqual([]);
  });

  it('每条联系方式都有给人看的 display 写法', () => {
    const bad = allWhatsapp.filter(({ w }) => !w.display || !String(w.display).trim()).map(label);
    expect(bad).toEqual([]);
  });

  it('whatsappLink 拼出正确的深链', () => {
    expect(whatsappLink('60123456789')).toBe('https://wa.me/60123456789');
  });
});

describe('社团信息页 — Instagram 不能拿显示名当 handle', () => {
  it('没有任何社团同时有 instagram 和 instagramPending', () => {
    const bad = CLUB_DIRECTORY.filter((c) => c.instagram && c.instagramPending).map((c) => c.id);
    expect(bad).toEqual([]);
  });

  it('handle 只含字母数字点下划线（不含 @、空格、网址）', () => {
    const bad = CLUB_DIRECTORY.filter((c) => c.instagram && !/^[A-Za-z0-9._]+$/.test(c.instagram)).map(
      (c) => `${c.id}: ${c.instagram}`,
    );
    expect(bad).toEqual([]);
  });

  it('instagramPending 存的是带空格的显示名 —— 正因为它不是 handle，才不能拼链接', () => {
    const pending = CLUB_DIRECTORY.filter((c) => c.instagramPending);
    // 实测这两个：'Xmum Diabolo Club' / 'Xmum Fitness | Gym Club'
    const noSpace = pending.filter((c) => !/\s/.test(c.instagramPending)).map((c) => `${c.id}: ${c.instagramPending}`);
    expect(noSpace).toEqual([]);
    expect(pending.map((c) => c.id).sort()).toEqual(['diabolo', 'fitness']);
  });

  it('instagramLink 拼出正确的主页地址', () => {
    expect(instagramLink('xmum_yco')).toBe('https://instagram.com/xmum_yco');
  });

  it('页面只用 club.instagram 拼链接，绝不碰 instagramPending', () => {
    expect(pageSrc).toContain('instagramLink(club.instagram)');
    expect(pageSrc).not.toMatch(/instagramLink\(\s*club\.instagramPending/);
    // 「待确认」那一条必须走非链接分支
    expect(pageSrc).toContain('club.instagramPending ?');
  });
});

describe('社团信息页 — 搜索与展示', () => {
  it('搜社团名、IG handle、联系人姓名、中文名都能命中', () => {
    const yoga = CLUB_DIRECTORY.find((c) => c.id === 'yoga');
    expect(clubSearchText(yoga)).toContain('yoga');
    expect(clubSearchText(yoga)).toContain('xmum_yogaclub');
    expect(clubSearchText(yoga)).toContain('teo ai wern');

    const yanan = CLUB_DIRECTORY.find((c) => c.id === 'yanan');
    expect(clubSearchText(yanan)).toContain('雅南华乐团');
  });

  it('没有联系人姓名时显示号码本身，而不是一个只会写「WhatsApp」的按钮', () => {
    // 名单里有 9 个社团只给了号码没给姓名；只写 WhatsApp 的话这些行会长得一模一样
    expect(pageSrc).toContain('w.name || w.display');
  });

  it('每个联系胶囊都带独立的复制按钮', () => {
    expect(pageSrc).toContain('handleCopy(key, w.number)');
    expect(pageSrc).toContain('handleCopy(`${club.id}-ig`, club.instagram)');
  });
});

describe('社团信息页 — 路由与入口', () => {
  it('路由已注册且是懒加载', () => {
    const routes = read('frontend', 'src', 'routes', 'layoutRoutes.jsx');
    expect(routes).toContain("const ClubDirectoryPage = lazy(() => import('../pages/Clubs/ClubDirectoryPage'));");
    expect(routes).toContain('path="about/club/directory" element={renderLazyRoute(ClubDirectoryPage)}');
  });

  it('注册在 about/club/:id 之前（否则 :id 会把 directory 吃掉）', () => {
    const routes = read('frontend', 'src', 'routes', 'layoutRoutes.jsx');
    // 必须匹配完整的 route 声明：文件里那句解释性注释也含 "about/club/:id"，
    // 用裸子串去 indexOf 会命中注释而不是真路由。
    const dirAt = routes.indexOf('<Route path="about/club/directory"');
    const idAt = routes.indexOf('<Route path="about/club/:id" element=');
    expect(dirAt).toBeGreaterThan(-1);
    expect(idAt).toBeGreaterThan(-1);
    expect(dirAt).toBeLessThan(idAt);
  });

  it('社团广场有第三张入口卡片', () => {
    const home = read('frontend', 'src', 'pages', 'Clubs', 'ClubsHome.jsx');
    expect(home).toContain('to="/about/club/directory"');
    expect(home).toContain('社团信息页');
  });

  it('入口卡片的配色变体在 CSS 里有定义', () => {
    const css = read('frontend', 'src', 'pages', 'Clubs', 'Clubs.css');
    expect(css).toContain('.club-feature--amber');
  });
});
