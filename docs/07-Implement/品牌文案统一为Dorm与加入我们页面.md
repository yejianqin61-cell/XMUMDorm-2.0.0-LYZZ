# 品牌文案统一为 Dorm + 左侧栏「加入我们」

> 2026-09-26。三项小改动的实施记录，全部已浏览器实测。

## 需求

1. 标签页不要显示「Jack 校园」，全站这个字样都去掉，改成 Dorm
2. 顶部 topbar 的「Dorm」改成「XMUM Dorm」
3. 左侧栏加「加入我们」，页面显示指定招募文案（微信 xmumdorm666）

## 一、标签页标题：为什么必须改 index.html

标签页标题是 **`frontend/index.html` 里的静态 `<title>`**，与路由无关。排查时发现一个
历史遗留：`frontend/src/components/Layout.jsx` 里

```js
const title = resolvePageTitle(pathname, isZh);   // 算出来了……
```

这个值**从没被用**——既没写进 `document.title`，也没传给 `TopBar`。也就是说
`frontend/src/config/pageTitles.js`（那份 20+ 条的中英文页面标题表）**一直是死代码**。
所以「标签页显示课程表/食堂」这类效果从来没有生效过，改标题只能改 `index.html`。

本次按约定取**静态标题**，所有页面统一显示 `Dorm`：

- `frontend/index.html`：`<title>Jack 校园</title>` → `<title>Dorm</title>`
- `frontend-app/index.html`：同上（Capacitor 壳里也是同一个站）
- `frontend/public/manifest.json`：检查过，`name` / `short_name` **本来就已是 `Dorm`**，无需改

### 「Jack」字样清理范围

清掉了所有**用户可见**位置的 Jack：`frontend/index.html`、`frontend-app/index.html`、
`html/register.html`（`<title>注册 - Jack</title>` + `<h1>Jack</h1>`，这是历史遗留页面，
目前**没有被任何静态目录挂载**，属于顺手清掉）、`server.js`（文件头注释 +
根路由 `message`）、`frontend/src/pages/PrivacyPolicy.jsx`（「厦马小筑 / Jack Dorm」→「厦马小筑」）。

**故意没动的**（内部标识，改名会弄坏线上）：

| 位置 | 原因 |
|---|---|
| `database.js` / `scripts/*` 的 `jack_campus` | 生产库的**库名** |
| `.env` 的 `jack-dorm-assets` | R2 存储桶名 |
| `package.json` 的 `jack-campus-social` | npm 包名 |
| `docs/**`、`CLAUDE.md` 里的「Jack Dorm」 | 仓库文档，不是站点文案 |
| `__tests__/routes/advertisements.test.js` 的 `jack_campus.…` | 测试夹具字符串 |

「厦马小筑」（中文名）**保留**——它不是本次要清理的字样，且广泛用于隐私政策、服务条款等处。

## 二、顶部 topbar：Dorm → XMUM Dorm

`frontend/src/components/shell/SiteHeader.jsx` 的 `<strong>Dorm</strong>` → `<strong>XMUM Dorm</strong>`。

品牌从 4 个字符变成 9 个，`.site-web-shell__brand-copy` 又是 `flex-direction: column`，
所以给 `.site-web-shell__brand-copy strong` 补了 `white-space: nowrap`，避免窄屏被折成两行。

> 只有 Web 端有这个 topbar。`frontend-app` 用的是自己的 `Layout` + `TopBar`，没有品牌字样；
> `mobile/app.json` 的 `name` 与 `LoginScreen` 本来就已经是 `Dorm`。

## 三、左侧栏「加入我们」

导航是数据驱动的——`frontend/src/components/shell/siteShellNav.js` 的 `SITE_PRIMARY_NAV_ITEMS`，
`SiteSidebar` 只是 `map` 一遍，所以**只需加一项**：

```js
{
  key: 'join-us',
  labelZh: '加入我们',
  labelEn: 'Join Us',
  to: '/about/join-us',
  icon: HeartHandshake,
  matchPrefixes: ['/about/join-us'],
}
```

位置按需求放在「跑腿」之后、「我的」之前（「我的」保持整列最底）。

新增页面 `frontend/src/pages/JoinUs.jsx` + `JoinUs.css`，路由 `about/join-us`
（懒加载，与 `/about/*` 其它页一致，公开无需登录）：

- 正文**逐字**使用给定文案（含 2026-09-26 追加的「如果你发现本站有任何使用问题」一句）
- 联系区两行：**微信** `xmumdorm666`、**邮箱** `yejianqin61@gmail.com`，
  每行各带一个「复制」按钮（`navigator.clipboard`，失败时 toast 引导手动选中；
  复制状态按行记，只让刚复制的那行变「已复制」）。邮箱另外做成 `mailto:` 链接，点了直接发信

> 小增强：复制按钮是我加的（微信号手选复制很别扭）。英文界面下文案是我翻译的对应英文，
> 中文界面是原文逐字。不想要复制按钮的话删掉即可。

## 四、验证

**自动化**：新增 `__tests__/frontend/brandAndJoinUs.test.js`（12 例）——锁住两个
`index.html` 的 `<title>`、「用户可见文件不再出现 Jack」、topbar 文案与 `nowrap`、
导航项字段与**位于跑腿与我的之间**的顺序、路由已注册、招募原文逐字存在。

全套 `npx jest` → **36 suites / 531 tests 全绿**；`vite build ✓`；
`frontend/src` 全量 no-undef 扫描 247 个文件 0 处。

**浏览器实测**（1440×900，真实浏览器）：

| 检查 | 结果 |
|---|---|
| `document.title` | `Dorm` |
| HTTP 层 `GET /` 返回的 `<title>` | `Dorm` |
| topbar 品牌 | `XMUM Dorm`，`white-space: nowrap` |
| 左栏导航项数 / 顺序 | 10 项，`加入我们` 位于 `跑腿` 与 `我的` 之间 |
| 点击后的 URL / 标题 | `/about/join-us` / `Dorm` |
| 页面正文 | 与需求原文逐字一致 |
| 微信行 | `微信 xmumdorm666`，带「复制」按钮 |
| 邮箱行 | `邮箱 yejianqin61@gmail.com`，`mailto:` 链接 + 「复制」按钮 |
| 复制按钮 | 点邮箱行的复制 → 该行变「已复制」+ toast「已复制」，微信行仍是「复制」（状态按行记） |
| 当前导航高亮 | `加入我们` 高亮（`aria-current="page"`），`广场` 未被误高亮 |
| 页面内是否还有 Jack | `false` |
| 是否触发错误边界 | `false` |
| 后端根路由 | `Dorm 后端服务运行正常！`（实测线上进程已生效） |

## 五、附带发现（未处理）

`Layout.jsx` 里的 `resolvePageTitle()` 与整个 `pageTitles.js` 是**死代码**。要么接上
（标签页就变成「课程表 · Dorm」这种每页不同的标题），要么删掉。本次按需求只做了静态标题，
两条路都没走，留待决定。
