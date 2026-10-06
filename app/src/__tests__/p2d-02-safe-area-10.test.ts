/**
 * P2D-02 · 安全区 10 条清单（甲域）—— 自动化用例
 *
 * 依据：[骨架规范 §6.5](../../../docs/app/design/App页面骨架与布局规范.md) 与宪法第 17 条（八条铁律）。
 * 台账文档：[甲-安全区10条清单.md](../../../docs/app/test/甲-安全区10条清单.md)。
 *
 * ## 本用例只测**能机器验证**的那 5 条
 * 第 3/5/9/10 条依赖真机（滚动到最后一项、横屏、系统最大字号、机型矩阵），
 * ⛔ 不用"源码里有这行"冒充"真机上看过" —— 它们在台账里如实标 `⚠️ 静态` / `❌ 未验`。
 * 第 6 条是**真缺陷**（代码里没有任何大屏断点）→ 用例把它**钉成当前事实**，修好时用例会提醒改台账。
 */

import * as fs from 'fs';
import * as path from 'path';

import { stripComments } from './helpers/sourceScan';

const SRC_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(SRC_ROOT, 'app');
const UI_DIR = path.join(SRC_ROOT, 'components', 'ui');

const read = (rel: string): string => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
const readApp = (rel: string): string => fs.readFileSync(path.join(APP_DIR, rel), 'utf8');
const readUi = (file: string): string => fs.readFileSync(path.join(UI_DIR, file), 'utf8');

describe('P2D-02 安全区 10 条清单', () => {
  it('第 1 条 · 顶栏铺满顶边：`Screen` 是唯一 inset 消费者（页面里 0 处自算）', () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(entry.name)) out.push(full);
      }
      return out;
    };
    const callers = walk(SRC_ROOT)
      .filter((file) => stripComments(fs.readFileSync(file, 'utf8')).includes('useSafeAreaInsets'))
      .map((file) => path.relative(SRC_ROOT, file))
      .sort();
    // 只允许两处：唯一容器 `Screen` 与根布局（S2）
    expect(callers).toEqual([
      path.join('app', '_layout.tsx'),
      path.join('components', 'ui', 'Screen.tsx'),
    ]);
  });

  it('第 2 条 · 底部留白归属唯一：`bottomMode:"tabbar"` 必须传 `tabBarHeight`（⛔ 不双倍）', () => {
    for (const file of ['index.tsx', 'tools.tsx', 'campus.tsx', 'me.tsx']) {
      const code = stripComments(readApp(path.join('(tabs)', file)));
      // `me.tsx` 是一行转发壳 → 跟到页面组合再断言（同 P2B-01 的处理）
      const forwarded = code.match(/from '@\/([^']+)'/);
      const screen = forwarded ? stripComments(read(`${forwarded[1]}.tsx`)) : code;
      if (!screen.includes('bottomMode="tabbar"')) continue;
      expect({ file, tabBarHeight: screen.includes('tabBarHeight') }).toEqual({ file, tabBarHeight: true });
    }
    // 原生 Tab 栏高度只在一处定义，四屏共用
    expect(stripComments(readApp(path.join('(tabs)', '_layout.tsx')))).toContain('TAB_BAR_CLEARANCE');
  });

  it('第 4 条 · 键盘：走容器显式计算（⛔ 不用 `KeyboardAvoidingView` 的隐式行为）', () => {
    const screen = stripComments(readUi('Screen.tsx'));
    expect(screen).not.toContain('KeyboardAvoidingView');
    // 键盘高度来自上下文（S6 的唯一来源）
    expect(readUi('Screen.tsx')).toMatch(/keyboard/i);
  });

  it('第 7 条 · 覆盖层各自处理 insets：经 prop 拿，⛔ 不自己读安全区', () => {
    // ⚠️ 用**原始源码**断言，不用 `stripComments`：
    //    这两个文件的说明注释里就写着"insets 由根布局注入"，剥注释会把证据一起剥掉
    for (const file of ['ActionSheet.tsx', 'Toast.tsx']) {
      const raw = readUi(file);
      expect({ file, viaProp: raw.includes('bottomInset') }).toEqual({ file, viaProp: true });
      // 判据用 import（注释里不会出现完整 import 语句）
      expect({ file, ownImport: raw.includes("from 'react-native-safe-area-context'") }).toEqual({
        file,
        ownImport: false,
      });
    }
  });

  it('第 8 条 · 暗/亮状态栏图标跟主题（⛔ 不出现"暗色主题 + 黑字"）', () => {
    const layout = stripComments(readApp('_layout.tsx'));
    expect(layout).toContain('StatusBar');
    expect(layout).toMatch(/scheme === 'dark' \? 'light' : 'dark'/);
  });

  it('第 6 条 · 大屏（`sw≥600dp`）：**只有两处读宽度**，未见断点式布局 → 未验', () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(entry.name)) out.push(full);
      }
      return out;
    };
    const widthReaders = walk(SRC_ROOT)
      .filter((file) => /useWindowDimensions|Dimensions\.get/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC_ROOT, file))
      .sort();
    // ⚠️ 这是**事实登记**而不是"合格判定"：读宽度 ≠ 做了大屏布局。
    //    台账里第 6 条标 `❌ 未验`；若将来真的做了断点布局，这里会红，逼着同步改台账。
    expect(widthReaders).toEqual([
      path.join('components', 'ui', 'BannerSlot.tsx'),
      path.join('components', 'ui', 'Screen.tsx'),
    ]);
  });

  it('第 9 条 · 静态：文本默认参与系统字号缩放（⛔ 没有全局关掉）', () => {
    const text = stripComments(readUi('Text.tsx'));
    expect(text).not.toContain('allowFontScaling={false}');
  });

  it('台账完整性：`甲-安全区10条清单.md` 正好 10 行结论，且每行都有结论标记', () => {
    const doc = fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'docs', 'app', 'test', '甲-安全区10条清单.md'),
      'utf8'
    );
    const rows = doc
      .split('\n')
      .filter((line) => /^\|\s*\d+\s*\|/.test(line));
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(row).toMatch(/✅ 机器|⚠️ 静态|❌ 未验/);
    }
  });
});
