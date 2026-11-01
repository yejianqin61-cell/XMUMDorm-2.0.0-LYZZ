# 校园快讯 UI · 阶段 1 / 第三轮

> 以下为阶段 1 的历史预览说明。当前真实数据、互动、收藏、分享和身份通知已继续接入；
> 当前交付与部署限制以 [01 至 05 集中交接文档](../../../../docs/07-Implement/01-05交付与数据库迁移交接.md) 为准。

## 集成与预览

新版列表位于原项目 `/about`。旧 `square-preview.html` 现在只跳转到 `/about`，不再渲染简化外壳。
顶部、导航和右侧课程、成长、假日、待办全部由现有 `SiteShellRoute` / `Layout` 渲染。
这些公共文件、样式、认证与数据来源均未修改。
早期 `src/dev/SquareNewsPreview.css` 已不再引用；按保留现有未跟踪文件的要求未删除它。

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

打开 `http://127.0.0.1:5173/about`。首次访问按原流程登录，或点击原有“暂不登录”后进入广场。
不需要生产数据库，模拟帖子和评论来自本地文件。
公共布局仍运行自己的数据请求；没有本地后端时，依赖 API 的右侧栏目可能为空或报错。
开发环境首页默认用演示轮播；切换真实 API 后，缺少后端时轮播按原逻辑不显示。
本轮没有提供伪造账号、绕过认证或伪造右侧数据。

## 详情与数据

模拟详情路由：`/about/campus/preview/:previewId`。
示例：`http://127.0.0.1:5173/about/campus/preview/demo-news-innovation`。
页面刷新后依然从 `campusNewsDemo` 找到同一帖子。未知 ID 显示空态，不请求后端。
真实 `/about/campus/:id` 与其现有组件完全保留。未来真实数据接入时替换适配入口，移除临时 preview 路由。
帖子详情是普通路由页面；只有图片查看器使用覆盖层。
从列表进入时返回按钮执行浏览器后退；直接打开时返回 `/about`。
模拟点赞、收藏共享内存状态，刷新后还原；不会保存到服务器。
评论使用 `campusNewsComments` 的虚构内容，支持二级展示；输入与发布禁用，分享仍禁用。

## 文件职责

- `CampusNewsFeed.jsx`：列表及路由导航。
- `CampusNewsDetail.jsx`：独立详情、完整正文、模拟评论与输入预留。
- `CampusNewsCard.jsx`：分类身份、Audience Badge 与四项操作栏。
- `CampusNewsMedia.jsx`：横向十图、延迟加载、拖动防误触、原图片预览。
- `CampusNewsModal.jsx`：只用于图片查看器。
- `campusNewsSession.js`：会话内互动状态与模拟详情路径。
- `campusNewsModel.js`：Category 与 Audience 独立模型和显式学院 ID 适配。
- `campusNewsDemo.js`、`campusNewsComments.js`：模拟帖子与评论数据。
- `CampusNews.css`：专用命名空间，不改变公共布局宽度和滚动规则。

受众为 `{ scope: 'all', collegeCodes: [] }` 或 `{ scope: 'colleges', collegeCodes: ['computing'] }`。
不从 school/college 推断分类或受众，不过滤用户，不连接用户中心。
十图在“校园手作日”中演示。真实后端仍最多三图，未来需另行扩展。

## 检查

```powershell
npm run build
npm run lint
node --test src/features/campus-news/campusNewsModel.test.js src/features/campus-news/campusNewsRouting.test.js
```

后续再接入真实发布、评论、收藏、我的记录及认证回跳，不在本轮范围内。

## 首页轮播开发预览

仅 Vite DEV 环境默认使用独立查询键的三张本地演示轮播图。
`/about?squareBanners=demo` 显式启用演示；`/about?squareBanners=api` 显式使用原 API。
选择在本地 sessionStorage 保留，因此刷新、从详情返回 `/about` 均保持选择。
生产构建忽略 URL 和会话中的演示开关，始终使用 `getSquareBanners` 与 `QK.squareBanners()`。
不修改公共轮播组件；原有四秒自动切换、箭头、圆点和点击行为均保留。
演示图片点击通过原有 url 类型跳到同源模拟详情（新标签页）。详情本身不显示轮播。
