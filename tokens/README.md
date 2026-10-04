# 设计令牌（tokens/）

**单一创作源 + 构建期生成。** 这个目录是「全局组件化，一改全部改」的物理落点。

---

## 1. 工作流（三步）

```
①  改  tokens/design-tokens.css          ← 人手**只改这一个文件**
                 │
②               │  node scripts/gen-tokens.js
                 ▼
③  App/Web 自动拿到新值（生成物）
```

```bash
# 改完 CSS 后跑一次：
node scripts/gen-tokens.js

# CI 里只校验、不写文件（部署产物只读时用）：
node scripts/gen-tokens.js --check

# 交给既有尺子复核（本脚本会给出这条命令）：
node scripts/contrast-check.js --file tokens/generated/tokens.check.json --fail
```

**改品牌色 = 改一个 CSS 文件 + 跑一次 codegen。** 这就是"一改全部改"。

---

## 2. 为什么需要 codegen（不是多此一举）

> **React Native 运行期没有 CSS 自定义属性。** App 读不到 `var(--x)`。

这是平台事实，不是选择。所以本项目的落地方式是：

| 产物 | 消费者 | 手写？ |
|---|---|---|
| `tokens/design-tokens.css` | **Web 直接消费**（原生 CSS 变量，运行时可用） | ✅ **唯一事实源** |
| `tokens/generated/native-tokens.ts` | **App（RN）** | ❌ 生成，含完整对比度元数据 |
| `tokens/generated/tokens.json` | 尺子 / 工具 / 审计 | ❌ 生成 |
| `tokens/generated/tokens.check.json` | `scripts/contrast-check.js` | ❌ 生成 |

CSS 既是**创作格式**，也是 **Web 的运行时格式**；App 侧由构建期编译成 TS。
⛔ **禁止**引入 `nativewind` / `restyle` / `unistyles` / `tamagui` 来"实现 CSS 变量"
——生成方案达到同一目的，且不多一层构建期依赖（《App 设计宪法》9.11.2）。
⛔ **禁止手工修改 `tokens/generated/` 下的任何文件** —— 下次 codegen 会覆盖。

---

## 3. 在 App（React Native）里怎么用

```tsx
import { colorsFor, space, radius, fontRole } from '../tokens/generated/native-tokens';

const c = colorsFor('dark');           // 或 'light'

<View style={{ backgroundColor: c['bg-surface'], padding: space.space_4, borderRadius: radius.radius_medium }}>
  <Text style={{ color: c['text-primary'] }}>标题</Text>
  <Text style={{ color: c['text-secondary'] }}>次要信息</Text>
</View>
```

**取用纪律**

1. 业务代码**只允许**消费语义层 `colorsFor(theme)` 与 `scale`；
   ⛔ 不得消费 `palette`（Foundation 原始色阶）——按档位取色正是宪法 2.3 禁止的
   "按档位推断 `textSafe`"的温床。
2. 带 `contrastOn` 语义的令牌，**只允许放在它声明的背景上**。
   例如 `text-muted`（暗色）声明的是 `bg-surface`；
   `text-success`（亮色）声明的是 `bg-surface`，**不得直接放在 `bg-canvas` 上**。
3. `textSafe: false` 的令牌**不承载需要读的信息**（`text-disabled` 等纯装饰）。
4. ⛔ 组件/屏内**不得**出现 `#hex` 与 `fontSize` 字面量（宪法 2.4.1）。

## 4. 在 Web 里怎么用

```css
@import '../tokens/design-tokens.css';
/* 亮色默认生效；暗色：<html data-theme="dark"> */
.card { background: var(--color-bg-surface); color: var(--color-text-primary); }
```

> ⚠️ 现状（**未改动本仓库任何既有文件**）：Web 现在消费的是
> `frontend/src/styles/tokens.css`（265 个令牌，纯亮色）。
> 本次**没有**改写它 —— 迁移 Web 是**独立任务**，需要所有者决定
> "品牌色是否反向统一 Web"（《App 设计令牌规范》§六-1）。

---

## 5. 令牌元数据协议（怎么加一个新令牌）

在 `design-tokens.css` 的对应主题块里加一行，附带注解：

```css
--color-text-foo: #4a5163;  /* [usage=text][textSafe] 说明文字 */
```

| 注解 | 必填 | 含义 |
|---|---|---|
| `[usage=…]` | ✅ | `surface` / `fill` / `text` / `icon` / `border` |
| `[textSafe]` | — | 声明可承载正文文字 → **生成器按阈值强制门禁** |
| `[contrastOn=--color-…]` | — | 校验基准背景；不写则按 usage 取默认底 |
| `[contrastAgainst=--color-…]` | — | 比值以该背景为分母（"本令牌在底上能否被看见"）|
| `[minRatio=3.0]` | — | 覆盖阈值（**只允许加权**）——**必须同时给 `minReason`** |
| `[minReason=…]` | 与 `minRatio` 同时 | 加权理由；缺失即报错退出码 1 |
| `[group=…]` | 仅非颜色令牌 | 生成 TS 里的分组名 |

阈值规则：`text` / `surface` / `fill` → **4.5:1**（正文）；
`icon` / `border` → **3:1**（非文本 UI 构件，WCAG 2.2 SC 1.4.11）。

块头必须带 `[layer=foundation|semantic][theme=dark|light]` 标记
（`:root` 在本文件里出现两次，不靠选择器猜身份）。

---

## 6. 门禁（本脚本自己就是门）

`gen-tokens.js` **算得出**每个 `textSafe` 令牌的实测对比度，因此它也有资格**拒绝**不合规的令牌：

- 任何 `textSafe: true` 且实测 < 阈值 → **打印全部违规 → 退出码 1**（不写文件）。
- `[minRatio]` 没配 `[minReason]` → 退出码 1（**不许静默放松**）。
- 源文件出现 `gradient(` / `font-family:` / `pt` 常量 / `box-shadow:` → 退出码 2。
- 注解键拼写疑似错误（如 `[usesage=…]`）→ 报错退出码 1。

已实测的负向用例：把亮色 `text-muted` 改成 `#b8bcc7` → 退出码 1；
给 `minRatio=3.0` 不写 `minReason` → 退出码 1。

> ⚠️ 本门禁是**额外新增**的一道门，**不是**对 `scripts/contrast-check.js` 的替代或削弱。
> 那个脚本一个字未改；它的配对清单由本脚本生成（`tokens.check.json`）。

**幂等**：输出不含时间戳 / 主机名 / 绝对路径 / 随机数，连跑两次字节一致（已实测 SHA256 相同）。

---

## 7. 本目录的文件

| 文件 | 手写 | 说明 |
|---|---|---|
| `design-tokens.css` | ✅ | **唯一事实源**。含品牌资产出处、每档的实测依据、【实测/算得/提案】标注与「已知冲突」登记 |
| `README.md` | ✅ | 本文件 |
| `generated/native-tokens.ts` | ❌ | App 消费 |
| `generated/tokens.json` | ❌ | 机器可读全量令牌 + 元数据 + 调色板 + 非颜色令牌 |
| `generated/tokens.check.json` | ❌ | 22 组 `textSafe` 配对，直接喂 `contrast-check.js --file` |

---

## 8. 接 CI

```yaml
- run: node scripts/gen-tokens.js --check        # 令牌自校验（含 textSafe 门禁）
- run: node scripts/contrast-check.js --file tokens/generated/tokens.check.json --fail
- run: node scripts/brand-ramp.js --hue 261.2 --fail
- run: node scripts/design-debt-report.js --path <app>/src --fail-on-zero
```

`design-tokens.css` 里登记了三条**待裁决**的尺子/编号口径问题（C6/C7 等），
接入 CI 前请先看该文件末尾的「已知冲突与契约扩展」。
