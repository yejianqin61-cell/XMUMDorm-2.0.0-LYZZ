/**
 * 第四轮 R4-17：列表类页面全部走 `ListScreen`（它内置下拉刷新 + 骨架屏 + 到底提示），
 * 不允许在 features 里直接用 FlatList / FlashList / SectionList 绕过它。
 */
import * as fs from 'fs';
import * as path from 'path';

const FEATURES = path.resolve(__dirname, '..', 'features');
/** 聊天式倒序流不是「信息流列表」，单独登记 */
const ALLOWED = new Set(['agent/AgentScreen.tsx']);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []
  );
}

describe('R4-17 · 列表统一入口', () => {
  it('features 里没有绕过 ListScreen 的原生列表', () => {
    const offenders = walk(FEATURES)
      .filter((f) => /\b(FlatList|FlashList|SectionList)\b/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(FEATURES, f).split(path.sep).join('/'))
      .filter((f) => !ALLOWED.has(f));
    expect(offenders).toEqual([]);
  });

  it('ListScreen 自带下拉刷新、骨架屏与到底提示', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'ui', 'ListScreen.tsx'), 'utf8');
    expect(src).toContain('PullToRefresh');
    expect(src).toContain('variant="skeleton"');
    expect(src).toContain('endLabel');
  });
});
