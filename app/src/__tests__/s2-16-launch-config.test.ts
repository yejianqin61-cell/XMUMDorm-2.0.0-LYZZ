/**
 * 阶段5-04 · 启动配置与令牌漂移断言
 *
 * 为什么需要它：`app.json` 不能引用令牌（是 JSON，且生成于原生构建之前），
 * 启动底色只能写成字面量。令牌一改就会悄悄不一致 —— 那个不一致的后果是
 * 「启动画面底色 ≠ 首屏底色」，收起时闪一下。这里把两者钉死。
 *
 * 断言只读文件，不跑 `expo config`，CI 不变慢。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const APP_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..');

type TokenColor = { name: string; value: string };
type Tokens = { themes: Record<'dark' | 'light', { colors: TokenColor[] }> };
type PluginEntry = string | [string, Record<string, unknown>];
type AppJson = {
  expo: {
    icon?: string;
    plugins?: PluginEntry[];
    android?: { adaptiveIcon?: Record<string, string> };
  };
};

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

const appJson = readJson<AppJson>(path.join(APP_ROOT, 'app.json'));
const tokens = readJson<Tokens>(path.join(REPO_ROOT, 'tokens', 'generated', 'tokens.json'));

const canvas = (theme: 'dark' | 'light'): string => {
  const found = tokens.themes[theme].colors.find(color => color.name === 'bg-canvas');
  if (!found) throw new Error(`令牌里找不到 bg-canvas（${theme}）—— 先确认 tokens.json 结构是否变了`);
  return found.value;
};

const splashEntries = (appJson.expo.plugins ?? []).filter(entry =>
  Array.isArray(entry) ? entry[0] === 'expo-splash-screen' : entry === 'expo-splash-screen'
);
const splashProps = (): Record<string, unknown> => {
  expect(splashEntries).toHaveLength(1);
  const entry = splashEntries[0];
  if (!Array.isArray(entry)) throw new Error('expo-splash-screen 必须带配置项（只写包名等于没配）');
  return entry[1];
};

describe('启动画面配置与令牌一致', () => {
  it('亮色启动底色 = 亮色 bg-canvas', () => {
    expect(splashProps().backgroundColor).toBe(canvas('light'));
  });

  it('暗色启动底色 = 暗色 bg-canvas', () => {
    const dark = splashProps().dark as { backgroundColor?: string } | undefined;
    expect(dark?.backgroundColor).toBe(canvas('dark'));
  });

  it('expo-splash-screen 只注册一次，且启动图指向存在的 png', () => {
    expect(splashEntries).toHaveLength(1);
    const image = splashProps().image;
    expect(typeof image).toBe('string');
    expect(String(image).endsWith('.png')).toBe(true);
    expect(fs.existsSync(path.join(APP_ROOT, String(image)))).toBe(true);
    expect(Number(splashProps().imageWidth)).toBeGreaterThan(0);
  });

  it('启动配置没有改掉图标：icon 与自适应图标四项仍在', () => {
    expect(appJson.expo.icon).toBe('./assets/icon.png');
    expect(appJson.expo.android?.adaptiveIcon).toMatchObject({
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    });
  });
});
