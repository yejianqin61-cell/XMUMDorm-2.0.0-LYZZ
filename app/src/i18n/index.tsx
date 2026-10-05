/**
 * 双语词条层 —— 全 App 唯一的取词入口。
 *
 * 纪律：
 * 1. ⛔ 屏内不得出现"按语言写的内联三元"（`isZh` 后跟问号那种）—— 尺子 `i18nInlineTernary` 会拦（宪法 14）。
 * 2. `t()` 只接受 `MessageKey` → **缺词条是编译期错误**；运行期再兜一层 warn + 返回 key
 *    （⛔ 不返回空串：空串会让界面出现"看不见的洞"）。
 * 3. 与主题层同构：**系统语言由根布局注入**（`systemLocale`），本层不自己去读原生模块
 *    —— 单一真源 + 可测。
 * 4. 语言集合 Phase 0 只落 `zh` / `en`；是否预留 `ms` 与默认语言 = TO-CONFIRM **C-13**（未定前不建空字典）。
 */

import * as React from 'react';

import { en } from './en';
import { zh, type MessageKey } from './zh';

export type Locale = 'zh' | 'en';

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { zh, en };

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: TranslateParams) => string;

export type I18nValue = {
  locale: Locale;
  t: Translate;
  setLocale: (locale: Locale) => void;
};

const I18nContext = React.createContext<I18nValue | null>(null);

/** `{n}` 插值；缺参数时**保留占位符**（比静默变成空更好排查） */
export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/** 纯函数版取词（供非组件代码与测试使用） */
export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.zh;
  const template = dict[key];
  if (template === undefined) {
    if (__DEV__) {
      console.warn(`[i18n] 缺词条：${key}（locale=${locale}）`);
    }
    return key;
  }
  return interpolate(template, params);
}

export type I18nProviderProps = {
  /** 显式锁定语言（设置页用）；不传则跟随 `systemLocale` */
  locale?: Locale | null;
  /** 系统语言（由根布局从 `expo-localization` 读出后传入） */
  systemLocale?: Locale | null;
  children: React.ReactNode;
};

export function I18nProvider({
  locale = null,
  systemLocale = null,
  children,
}: I18nProviderProps): React.ReactElement {
  const [override, setOverride] = React.useState<Locale | null>(locale);
  const effective: Locale = override ?? systemLocale ?? 'zh';

  const value = React.useMemo<I18nValue>(
    () => ({
      locale: effective,
      t: (key, params) => translate(effective, key, params),
      setLocale: (next: Locale) => setOverride(next),
    }),
    [effective]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** 取词入口。没有 Provider 就抛（早失败优于静默显示 key） */
export function useI18n(): I18nValue {
  const value = React.useContext(I18nContext);
  if (value === null) {
    throw new Error('useI18n 必须在 I18nProvider 内使用：词条只能来自唯一词条层');
  }
  return value;
}

/** 给根布局用：把系统语言码收敛成受支持的两种之一 */
export function normalizeLocale(languageCode: string | null | undefined): Locale {
  if (!languageCode) return 'zh';
  return languageCode.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export { zh, en };
export type { MessageKey };
