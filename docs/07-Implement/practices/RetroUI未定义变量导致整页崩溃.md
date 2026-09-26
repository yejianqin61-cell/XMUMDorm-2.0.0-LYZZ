# RetroUI 化引入的「未定义变量」导致整页崩溃（`/about/club/my`）

> 一次真实事故的复盘（2026-09-26）。适用于任何「组件重写后某个变量名写错」的渲染期崩溃。

## 症状

- `/about/club/my` 打开即失败：**页面被替换成兜底页**「页面渲染失败 / 可以重新加载重试」，
  展开「错误详情」只有一行：**`shape is not defined`**。
- 同一个组件被用在 `/about/club/:id`、`/about/club/:id/members`，所以**三个社团页面一起崩**。
- 修复前这道兜底页还不存在（那时是**纯白屏**）——`RouteErrorBoundary` 是 2026-09-26 才加上的，
  它把「白屏」变成了「可读的报错页」，这次事故因此**一眼定位**。

控制台的关键一行：

```
The above error occurred in the <AvatarImage> component. React will try to recreate this
component tree from scratch using the error boundary you provided, RouteErrorBoundaryBase.
```

## 根因

`frontend/src/components/retroui/Avatar.jsx`（引入于 `293963c feat(frontend): Phase4-5 — …Avatar… 全部RetroUI化`）：

```jsx
function AvatarImage({ className = '', src, alt = '', ...props }) {
  ...
  if (error || !src) return null;
  return (
    <img
      className={cn(
        'aspect-square h-full w-full object-cover',
        shape === 'circle' ? 'rounded-full' : '',   // ❌ shape 不在本函数作用域（只在 NeoAvatar 的 props 里）
        !loaded && 'hidden',
        className
      )}
```

`shape` 是外层 `NeoAvatar` 的 props，`AvatarImage` 既没接收也没定义它 →
ESM 严格模式下引用未声明标识符直接抛 `ReferenceError`。
而且它**只在有 `src` 时才会执行到**（第 42 行有 `if (error || !src) return null;` 早退），
所以「社团没有头像」时不崩、「有头像」时必崩——这也是为什么只在社团页暴露。

## 为什么没被拦住

1. **仓库没有任何 CI**（无 `.github/workflows`），`npm run lint` 从未自动跑过。
2. `npx eslint src` 对这个文件**一行命中**：

   ```
   src/components/retroui/Avatar.jsx
     50:9  error  'shape' is not defined  no-undef
   ```

   也就是说这类崩溃是**确定性可拦**的，纯流程缺口。
3. 完整 lint 目前有 100+ 条存量告警（`no-unused-vars` 57、`no-empty` 24、`react-hooks/*` 38 …），
   全绿不现实，于是「红了也没人看」→ 真正致命的那一条被淹没。

## 修复

删掉 img 级对 `shape` 的引用即可——**圆形裁切本来就由外层负责**：

```jsx
// NeoAvatar 基础类：relative flex shrink-0 items-center justify-center border-2 border-black overflow-hidden font-bold
// 圆形：compoundVariants: [{ shape: 'circle', className: 'rounded-full' }]
```

实测确认外观不变（`/about/club/my` 的 `.club-my-card` 内头像容器）：
`border-radius = 3.35544e+07px`（Tailwind `rounded-full` 的 9999px 计算值）+ `overflow = hidden` →
图片被外层裁成圆形，删掉 img 自己的 `rounded-full` 不产生任何视觉差异（已截图核对）。

## 守卫（新增，纳入 `npx jest`）

| 层 | 位置 | 说明 |
|---|---|---|
| ① 精准 | `__tests__/frontend/frontendSourceLint.test.js` | 断言 `AvatarImage` 作用域内不出现 `shape`（去注释后匹配）、早退保护仍在 |
| ② 全量 | `scripts/check-frontend-no-undef.js` | 只查 `no-undef`，扫描 `frontend/src` **246 个文件**，约 **10s**，有问题退出码 1 |
| ③ 兜底 | `RouteErrorBoundary` | 万一还有漏网：白屏 → 可读报错页 + 「重新加载」 |

② 只查 `no-undef` 是刻意的：**存量其它规则 100+ 条无法一次清零，而 `no-undef` 是唯一会当场崩页的一类。**
修复后全量扫描结果：**0 处**（说明这是前端最后一处未定义标识符）。

为什么 ② 走子进程：ESLint 9 用动态 `import()` 加载 flat config，
在 Jest 的 VM 里会抛 `A dynamic import callback was invoked without --experimental-vm-modules`，
所以不能在 jest 进程内直接调用 ESLint API，改为 `execFileSync(node scripts/check-frontend-no-undef.js)`。

单独手动跑（推荐在合并任何 RetroUI / 组件改动之前）：

```bash
node scripts/check-frontend-no-undef.js
# [no-undef] OK — frontend/src 下 246 个文件没有未定义标识符
```

反向验证（注入一个假标识符，确认守卫会红）：

```
[no-undef] 发现 1 处未定义标识符（渲染时会直接崩掉整个路由）：
  frontend\src\components\retroui\Card.jsx:21:17  '__definitelyNotDefined' is not defined.
```

## 验证

| 页面 | 修复前 | 修复后 |
|---|---|---|
| `/about/club/my` | 兜底页「页面渲染失败」+ `shape is not defined`，0 张卡片 | 1 张卡片（DormCommittee）、头像 `naturalWidth>0` 已加载、无兜底页 |
| `/about/club/1` | 同样崩溃 | 正常渲染（社团名存在、头像 1 张） |
| `/about/club/1/members` | 同样崩溃 | 正常渲染 |
| `/about/club`（社团大全） | 正常（该页不渲染头像） | 正常 |

```
Test Suites: 32 passed / Tests: 464 passed   （新增 frontendSourceLint 4 例）
```

## 规约

1. **改 RetroUI / 组件层之后，合并前必须跑 `node scripts/check-frontend-no-undef.js`**
   （或至少 `npx eslint <改动文件>`）。这类错误没有运行时宽容度，直接崩整页。
2. 未定义标识符的报错**只会在对应的渲染分支被执行时出现**（如「有头像才崩」），
   所以「本地点几下没问题」不能证明没有这类错误，必须靠静态检查。
3. **错误边界是最后一道防线，不是第一道。** 它把白屏变成可读报错页，但不能替代 lint/CI。
4. 建议（未实施）：给仓库加一条最小 CI（或 pre-push hook）只跑
   `node scripts/check-frontend-no-undef.js` + `npx jest`，成本约 1 分钟，能拦住本次这类事故。
