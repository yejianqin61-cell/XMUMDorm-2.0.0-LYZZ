/**
 * 令牌层入口（App 侧）
 *
 * ⛔ **只做重导出** —— 不复制、不改写、不补默认值。生成物是唯一事实源：
 *    `tokens/design-tokens.css`（人只改这一个文件）
 *      → `node scripts/gen-tokens.js`
 *        → `tokens/generated/native-tokens.ts`（本文件重导出的对象）
 *
 * **为什么必须有这一层**（宪法 2.1）：RN 没有运行期 CSS 自定义属性，App 读不到 `var(--x)`，
 * 因此令牌源在**构建期**被编译成本模块。改品牌色 = 改一个 CSS 文件 + 重跑 codegen
 * = 一改全部改（宪法 1.4）。
 *
 * **业务代码只允许消费**：`colors[theme]`（语义层）与 `scale`（非颜色令牌）。
 * ⛔ 本文件**故意不导出 `palette`** —— 调色板只以"色值表"形式用于对照与审计，
 *    业务代码按调色板档位取色正是宪法 2.3 禁止的"按档位推断"。
 */
export {
  colors,
  colorsFor,
  darkColors,
  lightColors,
  scale,
  platformSeed,
} from '../../../tokens/generated/native-tokens';

export type {
  ColorToken,
  TokenTheme,
  TokenUsage,
  ThemeColorTokens,
  DarkColorTokenName,
  LightColorTokenName,
} from '../../../tokens/generated/native-tokens';
