# React 零基础入门与手绘稿上手指南

> 目标：零基础学会用 React 做移动端前端，并把手绘的样式图变成真实页面。

---

## 一、先搞清楚几件事

### 1.1 什么是 React？

- React 是一个 **用 JavaScript 做界面的库**，由 Facebook（现 Meta）维护。
- 你写的是「组件」：一小块一小块的 UI（按钮、列表、一整页），然后拼成完整应用。
- 页面数据变了，React 会帮你**只更新该变的那一块**，不用自己改 DOM。

### 1.2 为什么适合你现在的项目？

- 你要做**移动端优先**、**类 App** 的网页；React 配合移动端 UI 库（如 Ant Design Mobile）很适合。
- 后端已经用 **REST API + JWT** 写好了，React 里用 `fetch` 调接口、存 token 即可，和现在 `html/config.js` 里配的 `API_BASE_URL` 思路一样。

### 1.3 手绘稿怎么用？

- 手绘稿 = **视觉与布局的参考**。
- 做法：把手绘稿放在项目里（例如 `docs/mockups/` 或 `md笔记/` 下），开发时**对照着看**，把「一块块区域」对应成 React **组件**，把「线框和标注」变成**布局和样式**。
- 若手绘稿是纸质的，可以拍照/扫描后放进项目；若是电子图，直接存为 `页面名.png` 即可。本指南后面会教你怎么「从手绘稿到页面」。

---

## 二、环境准备（只做一次）

### 2.1 安装 Node.js

- 你已有 Node（跑过后端、执行过 `npm install`），一般不用再装。
- 终端执行确认：
  ```bash
  node -v
  npm -v
  ```
  能显示版本号即可。

### 2.2 用 Vite 创建一个 React 项目（推荐）

在**项目根目录外**或**项目内单独一个文件夹**里执行（二选一）：

```bash
# 在项目外：例如桌面
cd Desktop
npm create vite@latest jack-frontend -- --template react

# 或在 Jack 项目内新建前端目录
cd C:\Users\叶健钦\Desktop\Jack
npm create vite@latest frontend -- --template react
```

然后进入目录装依赖：

```bash
cd jack-frontend
# 或 cd frontend
npm install
```

### 2.3 启动看看

```bash
npm run dev
```

浏览器打开终端里提示的地址（一般是 `http://localhost:5173`），能看到 Vite + React 的默认欢迎页，说明环境 OK。

---

## 三、React 最核心的 3 个概念（零基础必会）

### 3.1 组件 = 一块 UI

- 一个 **.jsx** 文件（或 .tsx）就是一个组件。
- 组件里**返回一段「像 HTML」的写法**，叫做 **JSX**。

示例：一个标题组件

```jsx
// src/components/PageTitle.jsx
function PageTitle() {
  return (
    <h1 className="title">食堂</h1>
  );
}

export default PageTitle;
```

- `return` 里只能有**一个最外层标签**（例如一个 `<div>` 或 `<h1>`）。
- 写样式用 `className`（因为 class 在 JS 里是关键字），对应 CSS 里的类名。

### 3.2 用「属性」把数据传进组件（props）

- 父组件把数据通过**属性**传给子组件，子组件用 `props` 接收。

示例：带文案的按钮

```jsx
// 父组件里
<MyButton text="提交" />

// MyButton.jsx
function MyButton(props) {
  return <button>{props.text}</button>;
}
```

- 这样同一组件可以复用在不同地方，只是文案不同。

### 3.3 状态：会变的数据（useState）

- 会随用户操作或接口结果**变化**的数据，用 **useState** 存。

示例：点击一次数字加一

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

- `count` 是当前值，`setCount` 用来改它；一改，React 会重新画这一块界面。

这三样（**组件 + props + useState**）掌握后，就能做大部分简单页面；接口数据用 `useState` 存，从接口取到后 `setXxx` 更新，页面就跟着变。

---

## 四、如何把手绘稿变成 React 页面（实操思路）

### 4.1 步骤一：把手绘稿放进项目

- 在项目里建一个文件夹专门放设计稿，例如：
  - `frontend/public/mockups/` 或
  - `md笔记/mockups/`
- 把手绘稿保存为图片（如 `首页.png`、`食堂-店铺列表.png`、`商品详情.png`），命名清楚，方便对照。

### 4.2 步骤二：从稿子「拆」出组件和布局

- 看手绘稿时，用笔或脑子**框出一个个区域**：
  - 顶部：导航/标题 → 一个 **Header** 组件
  - 底部：几个 Tab → 一个 **TabBar** 组件
  - 中间：列表、卡片、表单 → 各做成 **XxxList**、**XxxCard**、**XxxForm** 组件
- 先不管接口，用**假数据**把布局和大致样式做出来，和手绘稿**尽量像**。

### 4.3 步骤三：先做一页「静态版」

- 选**最简单的一页**（例如「食堂-区域列表」或「排行榜」）。
- 在 React 里新建一个页面组件，例如 `CanteenRegions.jsx`，把这一页的 JSX 写出来：
  - 从上到下：Header → 区域列表（几个卡片或列表项）→ 底部 TabBar（可先写死）。
- 用 **CSS** 或 **CSS Module** 照着稿子调：
  - 字体大小、颜色、间距、圆角、是否居中、最大宽度等。

### 4.4 步骤四：接上真实数据

- 用 `useState` 存列表数据（如 `regions`）。
- 在 **useEffect** 里调你们后端的接口（如 `GET /api/canteen/regions`），把结果 `setRegions(...)`。
- 页面上用 `regions.map(...)` 把每条数据渲染成一个卡片或一行。

这样你就完成「手绘稿 → 一页可用的 React 页面」的完整流程；其他页面重复同样思路即可。

---

## 五、和现有后端的对接方式

### 5.1 接口基地址

- 在 React 项目里用**环境变量**存后端地址，方便本地和生产切换。
- Vite 规定环境变量要以 `VITE_` 开头才能在页面里用。

在项目根目录新建 `.env.development`：

```env
VITE_API_BASE_URL=http://127.0.0.1:4040
```

在代码里这样用：

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4040';

fetch(`${API_BASE}/api/canteen/regions`)
  .then(res => res.json())
  .then(data => console.log(data));
```

### 5.2 登录态（JWT）

- 登录接口返回 token 后，存到 **localStorage**（或 sessionStorage）。
- 之后每次请求在 **Header** 里带上：
  - `Authorization: Bearer <token>`
- 可以在一个统一的「请求封装」里做：所有请求自动带 token，401 时跳转登录页。

这些在「先做静态页、再做接口」的顺序里，可以放在后面一步专门做。

---

## 六、建议的学习与开发顺序

| 顺序 | 内容 | 说明 |
|------|------|------|
| 1 | 用 Vite 建好 React 项目，跑起来 | 见第二节 |
| 2 | 做一个小练习：一个页面里有一个列表（假数据），点一项能弹个提示 | 熟悉组件、props、useState、onClick |
| 3 | 把手绘稿整理进项目，选一页照着做「静态版」 | 只做布局和样式，数据写死 |
| 4 | 这一页接真实接口（如 regions 或 rankings） | 熟悉 fetch、useEffect、useState |
| 5 | 做登录页 + 存 token + 请求头带 token | 统一请求封装 |
| 6 | 按手绘稿一页一页做：首页、食堂、排行榜、个人中心等 | 每页先静态再接接口 |

---

## 七、推荐要学的语法与 API（按需查）

- **JSX**：`return ( <div>...</div> )`、`{变量}`、`{条件 && <组件 />}`、`{数组.map(item => <li key={item.id}>...</li>)}`
- **组件**：`function Xxx(props) { ... }`、`export default Xxx`
- **Hooks**：`useState`、`useEffect`（发请求、订阅）
- **路由**：`react-router-dom` 的 `BrowserRouter`、`Routes`、`Route`、`Link`、`useNavigate`

不需要一次全学完，做到哪一步查哪一步即可。

---

## 八、手绘稿放在哪里、怎么用（小结）

- **存放**：在项目里建 `mockups` 或 `docs/mockups`，把手绘稿图片放进去（如 `首页.png`、`食堂-区域.png`）。
- **使用**：开发时打开图片对照，按「区域 → 组件」「线框 → 布局和样式」来写；先做静态再接接口。
- 若你愿意，也可以把每张手绘稿**简短描述**写进一个 md（例如：顶部标题、下面 5 个区域卡片、底部 4 个 Tab），我可以根据描述帮你拆成组件名和页面结构，再写对应 React 示例代码。

---

**下一步建议**：先完成第二节「用 Vite 创建 React 项目并跑起来」，再选你手绘稿里**最简单的一页**，告诉我页面名称和大致内容（或把手绘稿描述/截图路径发给我），我可以按那一页给你写一版**完整的页面组件 + 简单样式**示例，你直接对照学、再改自己的稿子。
