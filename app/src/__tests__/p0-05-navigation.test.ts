/**
 * P0-05 · 五格底栏导航壳 —— 自动化用例（TC-P0-05-1A … 8A）
 *
 * 设计取舍：**原生 Tabs 在 Jest 里跑不起来**（需要原生模块），所以这里验的是
 * 「配置 + 语义」这层 —— 而"点了不切页"恰恰是**纯逻辑**：
 *   `resolveTabPress('publish')` 必须返回 `switchTab: false`。
 * 真机行为（Android `disabled` 是否拒绝选中、`Label hidden` 是否只作用于第 5 格）
 * 见 P0-05 §4.8 的 6 条清单。
 *
 * 依据：App 设计宪法 4.1 / 4.3 / 4.9 · 骨架规范 §2 / §3。
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  ACTION_TAB_KEY,
  MAX_TAB_SLOTS,
  PUBLISH_CENTER_ROUTE,
  TAB_BAR_HEIGHT,
  TAB_DEFINITIONS,
  assertTabBarInvariants,
  buildTabBarConfig,
  getTabByPath,
  getTabDefinition,
  resolveTabPress,
} from '@/features/navigation/tabConfig';
import {
  INITIAL_PUBLISH_CENTER_STATE,
  closePublishCenter,
  requestOpenPublishCenter,
} from '@/features/navigation/publishCenterGate';

const SRC_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(SRC_ROOT, 'app');

function walkSource(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSource(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const readSrc = (rel: string): string => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');

describe('P0-05 五格底栏导航壳', () => {
  describe('TC-P0-05-1A · 五格构成与第六格禁令', () => {
    it('恰好 5 格，且顺序为 广场 / 工具 / 校园里 / 我的 / 发布', () => {
      expect(TAB_DEFINITIONS.map((t) => t.key)).toEqual([
        'square',
        'tools',
        'campus',
        'me',
        'publish',
      ]);
    });

    it('格数不超过硬上限（宪法 4.9.4）', () => {
      expect(TAB_DEFINITIONS.length).toBeLessThanOrEqual(MAX_TAB_SLOTS);
      expect(MAX_TAB_SLOTS).toBe(5);
    });

    it('动作型格位恰好 1 个（第 5 格）', () => {
      const actions = TAB_DEFINITIONS.filter((t) => t.isAction);
      expect(actions).toHaveLength(1);
      expect(actions[0].key).toBe(ACTION_TAB_KEY);
    });

    it('不变量守卫可执行且不抛', () => {
      expect(() => assertTabBarInvariants()).not.toThrow();
    });

    it('route / path 唯一（否则深链与 Trigger 名会撞车）', () => {
      expect(new Set(TAB_DEFINITIONS.map((t) => t.route)).size).toBe(5);
      expect(new Set(TAB_DEFINITIONS.map((t) => t.path)).size).toBe(5);
    });
  });

  describe('TC-P0-05-2A / 3A / 4A · 图标与标签', () => {
    it('第 5 格图标是**平台图标名** add / plus（⛔ 不是 Lucide）', () => {
      const action = getTabDefinition('publish');
      expect(action?.icon.android).toBe('add');
      expect(action?.icon.ios).toBe('plus');
    });

    it('第 5 格**没有可见文字标签**，但**有可读标签**（骨架规范 §2.4 / §3.4）', () => {
      const action = getTabDefinition('publish');
      expect(action?.labelVisible).toBe(false);
      expect(action?.a11yLabelKey).toBe('tab.publish');
    });

    it('四个导航格都有可见标签（只有第 5 格可以没有）', () => {
      const navTabs = TAB_DEFINITIONS.filter((t) => !t.isAction);
      expect(navTabs.every((t) => t.labelVisible)).toBe(true);
      expect(navTabs).toHaveLength(4);
    });

    it('⛔ 底栏配置里不出现任何 Lucide 图标导入（宪法 4.9.6 / 16.1：底栏是第 2 层）', () => {
      const config = readSrc(path.join('features', 'navigation', 'tabConfig.ts'));
      expect(config).not.toMatch(/from ['"]lucide/);
      expect(config).not.toMatch(/require\(['"]lucide/);
    });

    it('底栏配置不引入任何视觉实现（无 StyleSheet / 无 RN 组件）', () => {
      const config = readSrc(path.join('features', 'navigation', 'tabConfig.ts'));
      expect(config).not.toMatch(/StyleSheet/);
      expect(config).not.toMatch(/from 'react-native'/);
    });
  });

  describe('TC-P0-05-5A · publishSlot 两种模式都能构造（降级路径不是口头承诺）', () => {
    it("mode='action'：五格 + 无 FAB（入口唯一，4.9.3）", () => {
      const config = buildTabBarConfig('action');
      expect(config.slots).toHaveLength(5);
      expect(config.fabVisible).toBe(false);
      expect(config.tabBarHeight).toBe(TAB_BAR_HEIGHT);
    });

    it("mode='fab'（**降级 B**）：四格 + 发布 FAB", () => {
      const config = buildTabBarConfig('fab');
      expect(config.slots).toHaveLength(4);
      expect(config.slots.some((t) => t.isAction)).toBe(false);
      expect(config.fabVisible).toBe(true);
    });
  });

  describe('TC-P0-05-6A · 动作型格位的语义：点了**不切页**', () => {
    it('点第 5 格 → openPublish 且 switchTab=false（4.9.2-①）', () => {
      expect(resolveTabPress('publish')).toEqual({
        type: 'openPublish',
        tab: 'publish',
        switchTab: false,
      });
    });

    it.each(['square', 'tools', 'campus', 'me'] as const)('点 %s → navigate 且 switchTab=true', (key) => {
      expect(resolveTabPress(key)).toEqual({ type: 'navigate', tab: key, switchTab: true });
    });
  });

  describe('TC-P0-05-7A · 重复点击不叠加（4.4.4）', () => {
    it('第一次请求应打开', () => {
      const { next, shouldOpen } = requestOpenPublishCenter(INITIAL_PUBLISH_CENTER_STATE, {
        tab: '/campus',
      });
      expect(shouldOpen).toBe(true);
      expect(next.open).toBe(true);
      expect(next.openedFrom?.tab).toBe('/campus');
    });

    it('已打开时再点 → shouldOpen=false 且状态**引用不变**（无副作用）', () => {
      const first = requestOpenPublishCenter(INITIAL_PUBLISH_CENTER_STATE, { tab: '/tools' }).next;
      const second = requestOpenPublishCenter(first, { tab: '/me' });
      expect(second.shouldOpen).toBe(false);
      expect(second.next).toBe(first);
    });

    it('关闭后回到**进入前**的一级位置与滚动量（4.9.2-②）', () => {
      const opened = requestOpenPublishCenter(INITIAL_PUBLISH_CENTER_STATE, {
        tab: '/campus',
        secondary: 'wall',
        scrollOffset: 320,
      }).next;
      const closed = closePublishCenter(opened);
      expect(closed.restoreTo).toEqual({ tab: '/campus', secondary: 'wall', scrollOffset: 320 });
      expect(closed.next).toEqual(INITIAL_PUBLISH_CENTER_STATE);
    });

    it('未打开时关闭是空操作（不产生假状态）', () => {
      const closed = closePublishCenter(INITIAL_PUBLISH_CENTER_STATE);
      expect(closed.restoreTo).toBeNull();
      expect(closed.next.open).toBe(false);
    });
  });

  describe('TC-P0-05-8A · 源码扫描：原生容器纪律与唯一安全区 Provider', () => {
    const files = walkSource(SRC_ROOT);

    it('⛔ 0 处自绘 Tab 栏（4.3）', () => {
      const banned = [
        /createBottomTabNavigator/,
        /createMaterialTopTabNavigator/,
        /tabBarStyle\s*:/,
        /tabBarComponent\s*:/,
      ];
      const hits = files.filter((f) => {
        const content = fs.readFileSync(f, 'utf8');
        return banned.some((re) => re.test(content));
      });
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
    });

    it('底栏用原生容器（unstable-native-tabs），且只有一处渲染它', () => {
      const hits = files.filter((f) =>
        /expo-router\/unstable-native-tabs/.test(fs.readFileSync(f, 'utf8'))
      );
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([
        path.join('features', 'navigation', 'nativeTabs.tsx'),
      ]);
    });

    it('SafeAreaProvider **恰好 1 处**，且在根布局（宪法 17.1-S4）', () => {
      const hits = files.filter((f) => /<SafeAreaProvider/.test(fs.readFileSync(f, 'utf8')));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([
        path.join('app', '_layout.tsx'),
      ]);
    });

    it('根布局挂了主题 / 词条 / 图标 Provider，并设置状态栏样式', () => {
      const layout = readSrc(path.join('app', '_layout.tsx'));
      expect(layout).toContain('ThemeProvider');
      expect(layout).toContain('I18nProvider');
      expect(layout).toContain('LucideProvider');
      expect(layout).toContain('<StatusBar style=');
    });

    it('strokeWidth 只在根布局的 Provider 设一次（宪法 16.5-2：⛔ 调用点不得传）', () => {
      // 只看"传值"（JSX prop / 对象字段赋值），类型声明 `strokeWidth?: number` 不算调用点
      const passing = /strokeWidth\s*[=:]\s*[^?\s]/;
      const hits = files.filter((f) => passing.test(fs.readFileSync(f, 'utf8')));
      expect(hits.map((f) => path.relative(SRC_ROOT, f))).toEqual([
        path.join('app', '_layout.tsx'),
      ]);
    });

    it('Lucide 图标一律逐图标子路径导入（宪法 16.5-1：⛔ 禁 barrel）；仅 Provider 走包根', () => {
      const importRe = /from ['"](lucide-react-native[^'"]*)['"]/g;
      const bad: string[] = [];
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        for (const match of content.matchAll(importRe)) {
          const specifier = match[1];
          const isIcon = /\/icons\//.test(specifier);
          const isProviderOnly =
            specifier === 'lucide-react-native' && /LucideProvider/.test(content);
          if (!isIcon && !isProviderOnly) {
            bad.push(`${path.relative(SRC_ROOT, file)} → ${specifier}`);
          }
        }
      }
      expect(bad).toEqual([]);
    });

    it('第 5 格占位路由存在且**只做重定向**（防深链进死路由）', () => {
      const placeholder = readSrc(path.join('app', '(tabs)', 'publish.tsx'));
      expect(placeholder).toContain('<Redirect');
      expect(placeholder).not.toContain('Screen');
    });

    it('发布中心的真实路由与占位路由**不是同一个**', () => {
      expect(PUBLISH_CENTER_ROUTE).toBe('/publish-center');
      expect(fs.existsSync(path.join(APP_DIR, 'publish-center.tsx'))).toBe(true);
    });

    it('四个目的地屏 + 信箱 + 发布中心都有路由文件', () => {
      for (const rel of ['(tabs)/index.tsx', '(tabs)/tools.tsx', '(tabs)/campus.tsx', '(tabs)/me.tsx', 'mailbox.tsx', 'publish-center.tsx']) {
        expect(fs.existsSync(path.join(APP_DIR, rel))).toBe(true);
      }
    });

    it('深链 path 能映射回一级格（栈底校正用，4.4.1）', () => {
      expect(getTabByPath('/tools')?.key).toBe('tools');
      expect(getTabByPath('/campus')?.key).toBe('campus');
      expect(getTabByPath('/nowhere')).toBeUndefined();
    });
  });

  describe('尺子 minTarget 的镜像断言（P0-02/P0-03 的缺口在此闭合）', () => {
    const files = walkSource(SRC_ROOT);

    it("页面已真的消费自有 UI 组件（`components/ui/` 引用 ≥1）", () => {
      const hits = files.filter((f) => fs.readFileSync(f, 'utf8').includes('components/ui/'));
      expect(hits.length).toBeGreaterThanOrEqual(1);
    });

    it("界面已真的调用 t('key')（≥1）", () => {
      const hits = files.filter((f) =>
        /(?<![\w.])t\(\s*['"]/.test(fs.readFileSync(f, 'utf8'))
      );
      expect(hits.length).toBeGreaterThanOrEqual(1);
    });
  });
});
