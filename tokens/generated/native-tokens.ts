/* ============================================================================
 * 自动生成 —— 请勿手工编辑。
 *
 * 生成器    ：scripts/gen-tokens.js
 * 唯一事实源：tokens/design-tokens.css（人手只改那一个文件）
 *
 * 为什么是"生成"而不是"运行时读取"：
 *   React Native 没有运行期 CSS 自定义属性，App 读不到 var(--x)。
 *   因此令牌源在**构建期**被编译成本模块。
 *   改品牌色 = 改一个 CSS 文件 + 重跑 codegen = 一改全部改。
 *
 * 分层纪律（《App 设计宪法》2.1）：
 *   业务代码**只允许**消费 `colors[theme]`（语义层）与 `scale`（非颜色令牌）。
 *   调色板（Foundation）只以 `palette` 的色值表形式导出，用于对照与审计；
 *   业务代码不得按调色板档位取色 —— 那正是宪法 2.3 禁止的"按档位推断"。
 *
 * 本文件不含任何手写色值：每个 value 都来自令牌源；
 * 每个 contrastRatio 都是生成器按 WCAG 2.x relative luminance 实测算得。
 * ========================================================================== */

export type TokenUsage = 'surface' | 'fill' | 'text' | 'icon' | 'border';
export type TokenTheme = 'dark' | 'light';

/** 校验基准背景的解析结果：无法定位基准底时为 null（仅 fill / surface 可能出现） */
export type ContrastBasis = {
  /** 校验基准背景（令牌名） */
  readonly token: string;
  /** 校验基准背景的字面量色值 */
  readonly value: string;
} | null;

/** 每个颜色令牌携带的完整元数据（宪法 2.3：六项缺一即不合格） */
export interface ColorToken {
  /** 色值（#rrggbb 小写） */
  readonly value: string;
  /** 用途：surface | fill | text | icon | border */
  readonly usage: TokenUsage;
  /** 可否承载正文文字。**由实测决定，不得按档位推断**（宪法 2.3） */
  readonly textSafe: boolean;
  /** 校验基准背景（令牌名）；无基准底时为 null */
  readonly contrastOn: string | null;
  /** 校验基准背景的字面量色值；无基准底时为 null */
  readonly contrastOnValue: string | null;
  /** 仅 border/icon：比值以该背景为分母（"本令牌在底上能否被看见"） */
  readonly contrastAgainst?: string;
  readonly contrastAgainstValue?: string;
  /** 实测算得的对比度；无可算基准时为 null */
  readonly contrastRatio: number | null;
  /** 该令牌适用的阈值下限 */
  readonly minRatio: number;
  /** 阈值来源：body-4.5 | non-text-3.0 | override(n) */
  readonly thresholdKind: string;
  /** 阈值加权的理由（仅 override 时存在；无理由生成器即报错） */
  readonly minReason?: string;
  /** 所属主题 */
  readonly theme: TokenTheme;
}

/** 主题 → 语义令牌表（宽化后的取值类型，供接受"任意语义令牌"的函数使用） */
export type ThemeColorTokens = Readonly<Record<string, ColorToken>>;

/** 语义层 · 暗色（一等公民，先定义） */
export const darkColors = {
  "bg-canvas": {
    value: "#12141a",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "bg-surface": {
    value: "#1b1e26",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "bg-raised": {
    value: "#242833",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "bg-sunken": {
    value: "#0d0f13",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "bg-brand-soft": {
    value: "#1a2740",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "bg-accent-soft": {
    value: "#2e2510",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "bg-success-soft": {
    value: "#12291f",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "bg-warning-soft": {
    value: "#2e2118",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "bg-danger-soft": {
    value: "#2d1d22",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-primary": {
    value: "#f2f4f9",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 16.73,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-secondary": {
    value: "#aab2c5",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 8.66,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-muted": {
    value: "#828a9e",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-surface",
    contrastOnValue: "#1b1e26",
    contrastRatio: 4.82,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-disabled": {
    value: "#565d70",
    usage: "text",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 2.8,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-brand": {
    value: "#7fa9f3",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 7.78,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "accent-text": {
    value: "#d98a45",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 6.73,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-success": {
    value: "#39c58d",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 8.37,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-warning": {
    value: "#d98a45",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 6.73,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-danger": {
    value: "#f36d6d",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 6.33,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "text-on-fill": {
    value: "#ffffff",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-action-primary",
    contrastOnValue: "#2452a6",
    contrastRatio: 7.41,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    minReason: "白字只允许出现在已达 7.41:1 的 brand-fill 上；其他填充一律用 text.on-accent / text.on-state",
    theme: "dark",
  },
  "text-on-accent": {
    value: "#12141a",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-action-accent",
    contrastOnValue: "#ffc300",
    contrastRatio: 11.45,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    minReason: "美团黄只承载深墨，白字 on 它仅 1.61:1，属红线",
    theme: "dark",
  },
  "text-on-state": {
    value: "#12141a",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-state-success",
    contrastOnValue: "#39c58d",
    contrastRatio: 8.37,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    minReason: "暗色主题的状态填充本身很亮，只允许深墨承载标签",
    theme: "dark",
  },
  "action-primary": {
    value: "#2452a6",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "action-primary-pressed": {
    value: "#3d6dc3",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "action-accent": {
    value: "#ffc300",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "action-accent-pressed": {
    value: "#b28c30",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "state-success": {
    value: "#39c58d",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "state-warning": {
    value: "#bb6a29",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "state-danger": {
    value: "#f36d6d",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "dark",
  },
  "icon-primary": {
    value: "#f2f4f9",
    usage: "icon",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 16.73,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
  "icon-secondary": {
    value: "#aab2c5",
    usage: "icon",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 8.66,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
  "icon-brand": {
    value: "#7fa9f3",
    usage: "icon",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 7.78,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
  "icon-disabled": {
    value: "#565d70",
    usage: "icon",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 2.8,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
  "border-subtle": {
    value: "#21252f",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 1.2,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
  "border-default": {
    value: "#2c3140",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 1.42,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
  "border-strong": {
    value: "#343a4b",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 1.62,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
  "border-focus": {
    value: "#5e90ea",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 5.83,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
  "border-brand": {
    value: "#7fa9f3",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#12141a",
    contrastRatio: 7.78,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "dark",
  },
} satisfies Readonly<Record<string, ColorToken>>;

export type DarkColorTokenName = keyof typeof darkColors;

/** 语义层 · 亮色（由暗色派生，完整成套） */
export const lightColors = {
  "bg-canvas": {
    value: "#f7f8fa",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "bg-surface": {
    value: "#ffffff",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "bg-raised": {
    value: "#ffffff",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "bg-sunken": {
    value: "#f4f5f8",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "bg-brand-soft": {
    value: "#e9f1fd",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "bg-accent-soft": {
    value: "#fdefd0",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "bg-success-soft": {
    value: "#eff8f4",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "bg-warning-soft": {
    value: "#fdf6ee",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "bg-danger-soft": {
    value: "#fdf2f2",
    usage: "surface",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-primary": {
    value: "#1b1f2c",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 15.45,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-secondary": {
    value: "#4a5163",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 7.46,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-muted": {
    value: "#6c7285",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 4.51,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-disabled": {
    value: "#9ba1b2",
    usage: "text",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 2.43,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-brand": {
    value: "#2452a6",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 6.98,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "accent-text": {
    value: "#6a5319",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 6.9,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-success": {
    value: "#277e5a",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 4.68,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-warning": {
    value: "#a75d24",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 4.67,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-danger": {
    value: "#be484b",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 4.69,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "text-on-fill": {
    value: "#ffffff",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-action-primary",
    contrastOnValue: "#2452a6",
    contrastRatio: 7.41,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    minReason: "白字只允许出现在 brand-fill / status-fill 上；美团黄一律用 text.on-accent",
    theme: "light",
  },
  "text-on-accent": {
    value: "#201a00",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-action-accent",
    contrastOnValue: "#ffc300",
    contrastRatio: 10.8,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    minReason: "美团黄只承载深墨，白字 on 它仅 1.61:1，属红线",
    theme: "light",
  },
  "text-on-state": {
    value: "#ffffff",
    usage: "text",
    textSafe: true,
    contrastOn: "--color-state-success",
    contrastOnValue: "#29845e",
    contrastRatio: 4.61,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    minReason: "亮色状态填充本身已达 4.51~4.61:1 载白字",
    theme: "light",
  },
  "action-primary": {
    value: "#2452a6",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "action-primary-pressed": {
    value: "#173874",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "action-accent": {
    value: "#ffc300",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "action-accent-pressed": {
    value: "#b28c30",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "state-success": {
    value: "#29845e",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "state-warning": {
    value: "#af6226",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "state-danger": {
    value: "#c35253",
    usage: "fill",
    textSafe: false,
    contrastOn: null,
    contrastOnValue: null,
    contrastRatio: null,
    minRatio: 4.5,
    thresholdKind: "body-4.5",
    theme: "light",
  },
  "icon-primary": {
    value: "#1b1f2c",
    usage: "icon",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 15.45,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
  "icon-secondary": {
    value: "#4a5163",
    usage: "icon",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 7.46,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
  "icon-brand": {
    value: "#2452a6",
    usage: "icon",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 6.98,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
  "icon-disabled": {
    value: "#9ba1b2",
    usage: "icon",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 2.43,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
  "border-subtle": {
    value: "#eceef4",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 1.09,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
  "border-default": {
    value: "#e4e7ef",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 1.16,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
  "border-strong": {
    value: "#b9bfd0",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 1.73,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
  "border-focus": {
    value: "#3d6dc3",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 4.73,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
  "border-brand": {
    value: "#2452a6",
    usage: "border",
    textSafe: false,
    contrastOn: "--color-bg-canvas",
    contrastOnValue: "#f7f8fa",
    contrastRatio: 6.98,
    minRatio: 3,
    thresholdKind: "non-text-3.0",
    theme: "light",
  },
} satisfies Readonly<Record<string, ColorToken>>;

export type LightColorTokenName = keyof typeof lightColors;

/** 两套主题的语义层。业务代码通过主题参数取用。 */
export const colors: { readonly dark: typeof darkColors; readonly light: typeof lightColors } = { dark: darkColors, light: lightColors };

/** 取某主题下的语义层（返回类型保留字面量键，拼错键名会在编译期报错） */
export const colorsFor = <T extends TokenTheme>(theme: T): (typeof colors)[T] => colors[theme];

/** 供 @expo/ui Host 锚定系统控件：用我们的品牌色，不用壁纸动态取色（宪法 9.12） */
export const platformSeed = {
  dark: darkColors["action-primary"].value,
  light: lightColors["action-primary"].value,
} as const;

/* ---------------------------------------------------------------------------
 * Foundation 调色板（**只读对照用**）
 * 业务代码禁止按这里的档位取色 —— 请取语义层。
 * ------------------------------------------------------------------------- */
export const palette = {
  "brand-50": "#e9f1fd",
  "brand-100": "#ccddfa",
  "brand-200": "#9fbff6",
  "brand-300": "#7fa9f3",
  "brand-400": "#5e90ea",
  "brand-500": "#3d6dc3",
  "brand-600": "#2452a6",
  "brand-700": "#173874",
  "accent-100": "#fdefd0",
  "accent-200": "#fad88d",
  "accent-300": "#ffc300",
  "accent-500": "#b28c30",
  "accent-700": "#6a5319",
  "success-500": "#39c58d",
  "success-600": "#29845e",
  "warning-500": "#bb6a29",
  "warning-400": "#d98a45",
  "warning-600": "#af6226",
  "danger-500": "#f36d6d",
  "danger-600": "#c35253",
  "neutral-0": "#ffffff",
  "neutral-25": "#f7f8fa",
  "neutral-50": "#f4f5f8",
  "neutral-100": "#eceef4",
  "neutral-200": "#e4e7ef",
  "neutral-300": "#b9bfd0",
  "neutral-400": "#9ba1b2",
  "neutral-500": "#6c7285",
  "neutral-600": "#4a5163",
  "neutral-900": "#1b1f2c",
  "dark-sunken": "#0d0f13",
  "dark-canvas": "#12141a",
  "dark-surface": "#1b1e26",
  "dark-raised": "#242833",
  "dark-text-primary": "#f2f4f9",
  "dark-text-secondary": "#aab2c5",
  "dark-text-muted": "#828a9e",
  "dark-text-disabled": "#565d70",
  "dark-border-subtle": "#21252f",
  "dark-border-default": "#2c3140",
  "dark-border-strong": "#343a4b",
  white: "#ffffff",
  ink: "#12141a",
  "ink-warm": "#201a00",
  "focus-dark": "#5e90ea",
  "focus-light": "#3d6dc3",
} as const;

/* ---------------------------------------------------------------------------
 * 非颜色令牌
 *
 * ⚠️ 字体（宪法 2.5）：
 *   ① 本模块**不导出任何 fontFamily** —— 字族由平台解析；Android 上把字体名
 *      拼错是静默回退的不可见 bug（RN #58750）。
 *   ② 字阶：**角色名**两边一致，**数值分端生成**（宪法 2.5-4）。
 *      Android 侧走 M3 官方档位（`fontMetrics`，数值来自生成器内置校验表）；
 *      ⚠️ iOS 的"系统文字样式 / Dynamic Type"RN 未暴露 `UIFontTextStyle`，
 *      当前两端共用 M3 数值 + `allowFontScaling`（已登记为新债，见 P1-03 §7）。
 *   ③ 数字对齐用 tabular-nums，不为此换字体。
 * ------------------------------------------------------------------------- */

/** font-role（角色，非数值） */
export const fontRole = {
  font_role_display: "display",
  font_role_title: "title",
  font_role_headline: "headline",
  font_role_body: "body",
  font_role_label: "label",
  font_role_caption: "caption",
  font_role_mono: "mono",
} as const;

/**
 * font-metrics：角色 → M3 官方档位 + 该档位的官方数值。
 * ⛔ 数值不是手写的：它逐字来自生成器内置的 M3 校验表（P1-03）。
 * ⚠️ `m3Weight` 只作**说明**用 —— RN 的字重仍只走 scale.fontWeight
 *    （宪法 2.5-5：不得假设 500/600 必然可区分）。
 */
export const fontMetrics = {
  font_metric_display: {
    m3: "displayLarge",
    size: 57,
    lineHeight: 64,
    tracking: -0.2,
    m3Weight: 400,
  },
  font_metric_title: {
    m3: "headlineLarge",
    size: 32,
    lineHeight: 40,
    tracking: 0,
    m3Weight: 400,
  },
  font_metric_headline: {
    m3: "headlineSmall",
    size: 24,
    lineHeight: 32,
    tracking: 0,
    m3Weight: 400,
  },
  font_metric_body: {
    m3: "bodyMedium",
    size: 14,
    lineHeight: 20,
    tracking: 0.2,
    m3Weight: 400,
  },
  font_metric_label: {
    m3: "titleMedium",
    size: 16,
    lineHeight: 24,
    tracking: 0.2,
    m3Weight: 500,
  },
  font_metric_caption: {
    m3: "bodySmall",
    size: 12,
    lineHeight: 16,
    tracking: 0.4,
    m3Weight: 400,
  },
  font_metric_mono: {
    m3: "bodyMedium",
    size: 14,
    lineHeight: 20,
    tracking: 0.2,
    m3Weight: 400,
  },
} as const;

/** font-weight（角色，非数值） */
export const fontWeight = {
  font_weight_regular: "normal",
  font_weight_strong: "bold",
} as const;

/** font-variant（角色，非数值） */
export const fontVariant = {
  font_variant_numeric: "tabular-nums",
} as const;

/** icon-size */
export const iconSize = {
  icon_size_inline: "16px",
  icon_size_body: "20px",
  icon_size_default: "24px",
  icon_size_large: "32px",
  icon_size_hero: "48px",
} as const;

/** space */
export const space = {
  space_1: "4px",
  space_2: "8px",
  space_3: "12px",
  space_4: "16px",
  space_6: "24px",
  space_8: "32px",
  space_12: "48px",
} as const;

/** radius */
export const radius = {
  radius_small: "8px",
  radius_medium: "12px",
  radius_large: "20px",
  radius_full: "9999px",
} as const;

/** border-width */
export const borderWidth = {
  border_width_hairline: "1px",
  border_width_brutal: "2px",
} as const;

/** touch-target */
export const touchTarget = {
  touch_target_ios: "44px",
  touch_target_android: "48px",
} as const;

/** motion-duration */
export const motionDuration = {
  motion_duration_fast: "120ms",
  motion_duration_base: "220ms",
  motion_duration_slow: "360ms",
} as const;

/** 非颜色令牌总表 */
export const scale = {
  fontRole,
  fontMetrics,
  fontWeight,
  fontVariant,
  iconSize,
  space,
  radius,
  borderWidth,
  touchTarget,
  motionDuration,
} as const;

/** 默认导出：一份完整的令牌层 */
export const tokens = { colors, palette, scale, platformSeed } as const;

export default tokens;
