# Web 桌面化布局规范

## 1. 目标

本规范用于指导 `frontend/` 从当前移动端 PWA 壳，演进为真正的桌面网页前端，同时不影响：

- `frontend-app/` 的 App 前端
- `shared/*` 共享 API / Query / 常量 / 工具层
- 现有后端接口与鉴权链路

## 2. 基本原则

### 2.1 平台分层原则

- Web 页面壳、导航、布局、桌面交互只存在于 `frontend/`
- App 页面壳、移动端手势、Capacitor 相关逻辑只存在于 `frontend-app/`
- 共享层只保留跨端稳定能力：
  - `shared/api/*`
  - `shared/query/*`
  - `shared/constants/*`
  - `shared/utils/*`

### 2.2 先结构后视觉

Web 改版必须按以下顺序推进：

1. 先确定信息架构
2. 先替换布局壳
3. 再抽页面模板
4. 最后做视觉升级

### 2.3 桌面优先，但保留响应式

- 桌面版是主设计目标
- 平板是兼容目标
- 手机 Web 允许保留简化版，但不再作为桌面页面设计依据

## 3. 断点规范

建议统一采用以下断点：

| 断点 | 范围 | 设计策略 |
| --- | --- | --- |
| `<= 767px` | 手机 | 允许沿用简化单列布局 |
| `768px - 1199px` | 平板 / 小桌面 | 双栏优先 |
| `>= 1200px` | 桌面主态 | 三段式或双栏主布局 |
| `>= 1440px` | 大屏桌面 | 可增加右侧辅助栏或更宽内容区 |

## 4. 页面壳规范

### 4.1 主站壳

Web 主站建议统一为三段式结构：

```text
+--------------------------------------------------------------+
| Global Header                                                |
+----------------------+--------------------------+------------+
| Left Navigation      | Main Content             | Aside      |
| module nav / user    | list / detail / form     | recommend  |
| quick entry          | primary work area        | helper box |
+----------------------+--------------------------+------------+
```

### 4.2 主站壳尺寸建议

| 区域 | 建议宽度 |
| --- | --- |
| 页面最大宽度 | `1440px - 1600px` |
| 左侧导航栏 | `240px - 280px` |
| 主内容区 | `minmax(720px, 1fr)` |
| 右侧辅助栏 | `280px - 340px` |
| 页面左右边距 | `24px - 40px` |

### 4.3 主站壳交互要求

- 顶部保留全局导航、搜索、消息、用户入口
- 左侧承载一级模块导航，不再依赖底部 Tab
- 右侧承载推荐、提示、二级信息、快捷动作
- 主内容区可滚动，避免整页“App 式全屏滑动”
- 路由切换应以页面切换为主，而不是四大 Tab 常驻滑屏

### 4.4 后台壳

后台保持独立风格，建议统一成标准管理台：

- 固定左侧菜单
- 顶部操作栏
- 主内容区表格 / 表单 / 详情
- 统一筛选区、工具栏、分页与状态反馈

## 5. 页面模板规范

### 5.1 列表页模板

适用页面：

- 广场流
- 校园资讯流
- 热搜列表
- 二手列表
- 社团列表
- 跑腿列表
- 食堂商家列表

结构建议：

```text
Page Header
Toolbar / Filters
Content List
Pagination or Infinite State
Right Aside (optional)
```

要求：

- 列表卡片宽度统一
- 过滤器与排序器放在列表上方
- 首屏应看到明确的信息分组

### 5.2 详情页模板

适用页面：

- 帖子详情
- 食物详情
- 社团详情
- 活动详情
- 校园通知详情
- 热搜详情

结构建议：

```text
Breadcrumb / Back
Main Detail Card
Meta / Actions
Comments / Related Content
Right Aside (author / recommend / related)
```

要求：

- 正文阅读宽度控制在舒适范围
- 操作区和正文区分层
- 关联内容不要挤占主正文

### 5.3 表单页模板

适用页面：

- 发帖
- 发布二手
- 发布社团活动
- 发布跑腿
- 编辑资料
- 商家编辑
- 菜品创建

结构建议：

```text
Page Header
Form Card
Section Blocks
Sticky Action Footer
```

要求：

- 表单分组清晰
- 提交按钮始终可见
- 桌面版单行字段可双列排布

### 5.4 个人中心页模板

适用页面：

- `MyZone`
- `MyPosts`
- `MyReviews`
- `ProfileEdit`
- `Schedule`
- `TodoList`
- `Diary`
- `Mailbox`

结构建议：

```text
Profile Summary
Quick Stats / Shortcuts
Main Workbench Area
Secondary Panels
```

要求：

- 从“手机个人中心”转为“桌面工作台”
- 强化摘要、快捷入口和任务信息密度

### 5.5 后台页模板

适用页面：

- `pages/Admin/*`

要求：

- 列表页统一搜索区、筛选区、表格区、分页区
- 详情页统一信息卡结构
- 配置页统一 section 分组与保存反馈

## 6. 导航规范

### 6.1 一级导航建议

Web 桌面端建议重组为以下一级导航语义：

- 首页 / 广场
- 树洞 / 帖子
- 食堂
- 社团
- 二手
- 新生指南
- 跑腿
- 我的
- 管理后台

### 6.2 导航原则

- 一级导航固定，语义清晰
- 二级导航归属于模块内部
- 面包屑只用于详情与深层页面
- 不再沿用 App 风格底部 Tab 作为 Web 主导航

## 7. 视觉与样式规范

### 7.1 Token 先行

优先统一以下设计 token：

- 颜色
- 间距
- 圆角
- 阴影
- 边框
- 字号
- 字重
- 层级

建议放在 Web 自己的样式层，不直接污染 App 主题。

### 7.2 内容宽度规范

| 内容类型 | 建议宽度 |
| --- | --- |
| 长文本正文 | `720px - 820px` |
| 普通详情内容 | `800px - 960px` |
| 列表主列 | `760px - 980px` |
| 表单主体 | `760px - 900px` |
| 后台表格区 | 尽量铺满主内容区 |

### 7.3 组件状态规范

每个页面模板都要统一以下状态：

- `loading`
- `empty`
- `error`
- `success`
- `submitting`

避免继续出现每页各写一套状态样式的情况。

## 8. 技术落地规范

### 8.1 可以改的范围

优先改造：

- `frontend/src/components/Layout.jsx`
- `frontend/src/components/TabBar.jsx`
- `frontend/src/components/TopBar.jsx`
- `frontend/src/pages/**`
- `frontend/src/components/**`
- `frontend/src/styles/**`
- `frontend/src/routes/layoutRoutes.jsx`

### 8.2 需要稳住的范围

正式治理期间默认不主动改：

- `frontend-app/**`
- `shared/api/**`
- `shared/query/**`
- `shared/constants/**`
- `shared/utils/**`

除非某项需求明确要求双端同步变更。

### 8.3 命名与目录规范

后续建议新增或收敛为：

- `pages/` 只放 route page
- `components/` 只放复用组件
- `features/模块名/` 放模块内页面片段与业务组件
- `styles/` 放 token、基础层、模板层样式

## 9. 验收标准

每轮布局治理至少满足：

1. `npm run build:web` 通过
2. 主导航在桌面宽度下可用
3. 列表页、详情页、表单页至少各有一个模板完成收敛
4. 登录、发帖、浏览、个人中心、后台入口不回归
5. 不引入对 `frontend-app/` 和 `shared/*` 的意外破坏

## 10. 结论

Web 桌面化改版本质上不是“把页面拉宽”，而是把当前移动端 App 壳替换为桌面网页壳，再逐步把内容模板、导航语义和视觉系统统一起来。

因此，第一优先级永远是：

- 先换壳
- 再做模板
- 再改页面

而不是先逐页堆样式。
