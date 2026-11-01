/**
 * P2X 树洞视觉层契约（2026-10-18 重构后）
 *
 * 负责人裁决把 HeroUI 从树洞视觉层撤掉（评审 P0：两套视觉体系 + Card 零间距 + 40dp 触控），
 * 改为**自有令牌组件层**。本文件守的是结构契约，防止有人又拼回旧形态：
 *   · 一份壳：`/campus` 与 `/campus/search` 只能是重定向；
 *   · 搜索就地展开：SearchField 在列表页顶部，⛔ 不再有第二个搜索入口/搜索页；
 *   · 详情：原生 Header（`Stack.Screen`）+ 粘性底栏（`Screen footer`）；
 *   · 列表与详情共用帖子部件；feed 静态媒体、详情才可切图；
 *   · 校园域**不导入 HeroUI**；万能墙不接实名帖子部件。
 */

import * as fs from 'fs';
import * as path from 'path';

import { readCode, walkSource } from './helpers/sourceScan';

const appRoot = path.resolve(__dirname, '..', '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(appRoot, ...segments), 'utf8');

describe('P2X Treehole 视觉层契约（令牌组件层）', () => {
  it('校园域不再导入 HeroUI（R-1 回退：视觉层改为自有令牌组件）', () => {
    const dir = path.join(appRoot, 'src', 'features', 'campus');
    const offenders = walkSource(dir).filter((file) => readCode(file).includes("from 'heroui-native'"));
    expect(offenders).toEqual([]);
  });

  it('树洞只有一份壳：/campus 与 /campus/search 都是重定向', () => {
    expect(read('src', 'app', 'campus', 'index.tsx')).toContain('<Redirect');
    expect(read('src', 'app', 'campus', 'search.tsx')).toContain('<Redirect');
    const sources = walkSource(path.join(appRoot, 'src')).map(readCode);
    expect(sources.some((code) => code.includes('CampusListScreen'))).toBe(false);
    expect(sources.some((code) => code.includes("'/campus/search'"))).toBe(false);
  });

  it('搜索就地展开：列表页顶部是 SearchField，独立搜索页已删除', () => {
    const feed = read('src', 'features', 'campus', 'TreeholeFeed.tsx');
    const searchBar = read('src', 'features', 'campus', 'TreeholeSearchBar.tsx');
    expect(feed).toContain('TreeholeSearchBar');
    expect(searchBar).toContain('SearchField');
    expect(searchBar).toContain('autoFocus');
    expect(searchBar).toContain('history');
    expect(fs.existsSync(path.join(appRoot, 'src', 'features', 'campus', 'CampusSearchScreen.tsx'))).toBe(false);
  });

  it('标签筛选是下拉列表（在列表头部，随内容滚走），不是一排常驻圆角 Tab', () => {
    const feed = read('src', 'features', 'campus', 'TreeholeFeed.tsx');
    const filter = read('src', 'features', 'campus', 'TreeholeTagFilter.tsx');
    expect(feed).toContain('TreeholeTagFilter');
    expect(feed).toContain('listHeader=');
    expect(feed).toContain('itemSeparator={Divider}');
    // 2026-10-18 所有者裁决：换成下拉列表（Select），⛔ 不再用 FilterChips
    expect(filter).toContain('Select');
    expect(filter.includes('ui/FilterChips')).toBe(false);
  });

  it('详情走原生 Header + 粘性底栏，⛔ 不再在内容里画返回按钮', () => {
    const screens = read('src', 'features', 'campus', 'CampusScreens.tsx');
    expect(screens).toMatch(/import \{[^}]*\bStack\b[^}]*\} from 'expo-router'/);
    expect(screens).toMatch(/import \{[^}]*\buseRouter\b[^}]*\} from 'expo-router'/);
    expect(screens).toContain('<Stack.Screen options={headerOptions} />');
    expect(screens).toContain('footer={state === \'content\' ? composer : undefined}');
    expect(screens).toContain('CommentComposer');
    expect(screens).toContain('ActionSheet');
    // 详情不再套 Card（旧实现外层 16 + Card 16 = 32dp 内缩）
    expect(screens.includes('Card')).toBe(false);
  });

  it('列表与详情共用帖子部件；feed 静态、详情才允许控制器', () => {
    const row = read('src', 'features', 'campus', 'TreeholePostRow.tsx');
    const detail = read('src', 'features', 'campus', 'TreeholePostDetail.tsx');
    const parts = read('src', 'features', 'campus', 'TreeholePostParts.tsx');
    expect(row).toContain("from './TreeholePostParts'");
    expect(detail).toContain("from './TreeholePostParts'");
    expect(parts).toContain('TreeholeAuthorLine');
    expect(parts).toContain('TreeholeActionBar');

    const media = read('src', 'features', 'campus', 'TreeholeMedia.tsx');
    expect(media).toContain("mode === 'feed'");
    expect(media).toContain('PanResponder');
    expect(media).toContain('theme.reduceMotion');
    expect(media).toContain('<Modal');
    expect(row).toContain('mode="feed"');
    expect(detail).toContain('mode="detail"');
  });

  it('万能墙继续走匿名投影与独立列表，不接实名帖子部件', () => {
    const wall = read('src', 'features', 'campus', 'WallFeed.tsx');
    expect(wall).toContain('WallPostRow');
    const wallRow = read('src', 'features', 'campus', 'WallPostRow.tsx');
    expect(wallRow).toContain('WallTemplateBody');
    expect(wallRow).toContain("t('screen.campus.read.anonymous')");
    expect(wallRow.includes('TreeholePostRow')).toBe(false);
    expect(wall.includes('TreeholePostRow')).toBe(false);
    const screens = read('src', 'features', 'campus', 'CampusScreens.tsx');
    expect(screens).toContain('WallTemplateBody');
    expect(screens).toContain('anonymous={kind === \'wall\'}');
  });

  it('互动条只输出图标 + 计数（⛔ 文字动词按钮）', () => {
    const parts = read('src', 'features', 'campus', 'TreeholePostParts.tsx');
    expect(parts).toContain("from 'lucide-react-native/icons/thumbs-up'");
    expect(parts).toContain("from 'lucide-react-native/icons/message-circle'");
    expect(parts).toContain('likeA11y');
    expect(parts).toContain('commentA11y');
    expect(parts.includes('`${likeCount} ')).toBe(false);
  });
});
