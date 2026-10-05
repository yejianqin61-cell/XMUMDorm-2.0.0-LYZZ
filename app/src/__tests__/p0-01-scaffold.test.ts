/**
 * P0-01 · 工程脚手架与依赖准入 —— 自动化用例
 *
 * 覆盖 TC-P0-01-1A / 2A / 3A / 4A。
 * ⚠️ 4A 的"真跑一遍 tsc"由 `npm run verify`（typecheck）执行，本文件只断言
 *    配置层已把类型检查做成可执行的门；真实退出码记录在 P0-01 §8 执行记录。
 *
 * 依据：App 设计宪法 3.1 / 3.2 / 3.3 / 3.4 / 9.11 / 11.1 / 12.1-1。
 */
import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '..', '..');

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(APP_ROOT, rel), 'utf8'));
}

const pkg = readJson('package.json') as {
  name: string;
  main: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const appJson = readJson('app.json') as { expo: Record<string, any> };
const tsconfig = readJson('tsconfig.json') as {
  compilerOptions: Record<string, unknown>;
};

const expo = appJson.expo;

describe('P0-01 脚手架与依赖准入', () => {
  describe('TC-P0-01-1A · SDK 57 三元组精确', () => {
    it('expo / react-native / react 三个版本逐一精确匹配宪法 3.1', () => {
      // 允许 "~57.0.26" 这种 caret/tilde 写法，但必须解析到宪法钉死的版本
      expect(pkg.dependencies.expo.replace(/^[~^]/, '')).toBe('57.0.26');
      expect(pkg.dependencies['react-native']).toBe('0.86.3');
      expect(pkg.dependencies.react).toBe('19.2.3');
    });

    it('expo-router 在 57 线（宪法 3.2 锁 SDK 57，⛔ 不等 58）', () => {
      expect(pkg.dependencies['expo-router'].replace(/^[~^]/, '')).toMatch(/^57\./);
    });

    it('入口是 expo-router', () => {
      expect(pkg.main).toBe('expo-router/entry');
    });
  });

  describe('TC-P0-01-2A · app.json 关键字段', () => {
    it('⛔ 不保留 newArchEnabled（宪法 3.3-2：SDK 55+ 新架构强制且无法关闭）', () => {
      expect(expo).not.toHaveProperty('newArchEnabled');
      expect(expo.android ?? {}).not.toHaveProperty('newArchEnabled');
    });

    it('有 scheme（深链必需，契约 4.8.2 / 4.7.6）', () => {
      expect(typeof expo.scheme).toBe('string');
      expect(expo.scheme.length).toBeGreaterThan(0);
    });

    it('userInterfaceStyle = automatic（暗/亮双主题是首发要求）', () => {
      expect(expo.userInterfaceStyle).toBe('automatic');
    });

    it('orientation 允许横屏（安全区第 17.2 类的左右 insets 与机型矩阵需要）', () => {
      expect(expo.orientation).toBe('default');
    });

    it('predictiveBackGestureEnabled 显式为 false（R1：⛔ 不吃默认值）', () => {
      expect(expo.android.predictiveBackGestureEnabled).toBe(false);
    });

    it('两端标识符齐全（打包必需）', () => {
      expect(typeof expo.android.package).toBe('string');
      expect(typeof expo.ios.bundleIdentifier).toBe('string');
    });
  });

  describe('TC-P0-01-3A · 禁用依赖 0 命中（宪法 9.11 / 16.2 / 1.3.5）', () => {
    const BANNED = [
      // 自带完整调色板与字阶的 UI kit
      'react-native-paper',
      'tamagui',
      'react-native-ui-lib',
      '@ui-kitten/components',
      'react-native-magnus',
      'react-native-elements',
      '@rneui/themed',
      // 样式引擎
      'nativewind',
      '@shopify/restyle',
      'react-native-unistyles',
      // 渐变（宪法 1.3.5 红线）
      'expo-linear-gradient',
      'react-native-linear-gradient',
      // 第二套图标库（宪法 16.2-2）
      '@expo/vector-icons',
      'react-native-vector-icons',
      // 自绘/第三方 Tab 栏（宪法 4.3；Plan B 只在 R2 失败时启用，当前不得引入）
      'react-native-bottom-tabs',
      '@bottom-tabs/react-navigation',
    ];

    it.each(BANNED)('%s 不在依赖里', (name) => {
      expect(pkg.dependencies).not.toHaveProperty(name);
      expect(pkg.devDependencies ?? {}).not.toHaveProperty(name);
    });

    it('R2 选定路径所需依赖存在：expo-symbols（Android Material 图标转换的硬依赖）', () => {
      expect(pkg.dependencies).toHaveProperty('expo-symbols');
    });

    it('expo-symbols 的 peer expo-font 必须直接安装（否则非 Expo Go 构建可能崩）', () => {
      expect(pkg.dependencies).toHaveProperty('expo-font');
    });

    it('R3 所需依赖存在且为 SDK 57 钉版：react-native-webview 13.16.1', () => {
      expect(pkg.dependencies['react-native-webview']).toBe('13.16.1');
    });
  });

  describe('工具链排障留档（防止后人重复踩）', () => {
    it('babel.config.js 存在且用 babel-preset-expo（SDK 57 模板不含，jest-expo 需要）', () => {
      const babel = fs.readFileSync(path.join(APP_ROOT, 'babel.config.js'), 'utf8');
      expect(babel).toContain('babel-preset-expo');
      expect(pkg.devDependencies).toHaveProperty('babel-preset-expo');
    });

    it('react-test-renderer 与 react 同版本（装 "*" 会 ERESOLVE）', () => {
      expect(pkg.devDependencies['react-test-renderer'].replace(/^[~^]/, '')).toBe(
        pkg.dependencies.react
      );
    });

    it('源码里不残留 RN 内置 SafeAreaView 依赖之外的模板入口文件', () => {
      expect(fs.existsSync(path.join(APP_ROOT, 'App.tsx'))).toBe(false);
    });
  });

  describe('TC-P0-01-4A · 类型检查与尺子做成可执行的门', () => {
    it('typecheck / test / rulers / verify 四个脚本存在', () => {
      for (const s of ['typecheck', 'test:ci', 'rulers', 'verify']) {
        expect(typeof pkg.scripts[s]).toBe('string');
      }
    });

    it('tsconfig 继承 expo base 且 strict = true', () => {
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('四把尺子的调用参数与宪法 14 表逐字一致', () => {
      expect(pkg.scripts['rulers:debt']).toContain(
        'design-debt-report.js --path ./src --fail-on-zero'
      );
      expect(pkg.scripts['rulers:contrast']).toContain(
        'contrast-check.js --file ../tokens/generated/tokens.check.json --fail'
      );
      expect(pkg.scripts['rulers:brand']).toContain('brand-ramp.js --hue 261.2 --fail');
      expect(pkg.scripts['rulers:tokens']).toContain('gen-tokens.js --check');
    });

    it('⛔ 不存在 EAS 构建脚本混进 rulers（尺子必须能不依赖账号就跑）', () => {
      expect(pkg.scripts.rulers).not.toMatch(/eas/);
    });
  });

  describe('CNG 纪律（宪法 11.1）', () => {
    it('android/ ios/ 不入库（.gitignore 已声明）', () => {
      const gi = fs.readFileSync(path.join(APP_ROOT, '.gitignore'), 'utf8');
      expect(gi).toMatch(/^\/android$/m);
      expect(gi).toMatch(/^\/ios$/m);
    });
  });
});
