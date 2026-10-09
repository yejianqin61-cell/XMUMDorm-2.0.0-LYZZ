# 指南首项：列表到详情阅读

日期：2026-10-06。基线：57b9c73。用户已批准继续，当前交用户验收。

## 1. 做了什么

- app/src/features/guides/GuidesScreens.tsx 组合公共 ListScreen、P3 DetailScreen 与 MarkdownReader。
  第一页通过 shared/api/handbook 请求，点击文章使用其 id 跳转详情。
  详情验证 id、正文类型与响应 id；卸载或换 id 后忽略旧请求结果。
- app/src/app/guides/index.tsx、[id].tsx 提供丙域路由，不改公共导航壳。
- app/src/i18n/zh.ts、en.ts 增量增加 square.guides 词条。
- p2x-bing-guides.test.tsx 验证列表到详情、返回、重试、非法 id、空态、英文、外链和加载态。

## 2. 证据

先写完整三份任务简报，再写测试。1771cc3 保存测试规格；首次命令退出 1，因目标模块未实现，0 用例执行。
最终 npm run typecheck 退出 0。
最终 npm run test:ci -- --runInBand：57 套件通过，2 套件跳过；1114 用例通过，16 跳过。
新增指南 9 用例全部通过；接口与 Router、系统外链调用使用 mock，公共阅读组件真实渲染。
npm run rulers 四项通过，退出 0；git diff --check 通过。
无 lint 脚本、配置与 eslint 可执行文件，未运行 lint；四把尺子不等同于 lint。
官方 API 核对：Expo SDK57 的 Router 和 Linking 文档，未新增依赖。

## 3. 验收操作

在 App 开发环境进入 /guides；点击文章，显示对应 Markdown 内容，再点返回。
外链类型文章显示浏览器打开按钮，仅接受 http/https。
首项只显示第一页最多 10 篇，完整分页在任务 02；不要把首项当指南全功能完成。

## 4. 未验证与风险

没有启动服务或读取 .env，没有真实接口或设备验证，也未访问远程数据库。
广场二级 Tab 入口由甲接线；此轮没有更改入口或公共组件。
完整分页、滚动恢复、Markdown 目录、大字与长文实测属于任务 02/03。
点赞收藏评论等完整文章交互未接入；公共 P3 互动栏当前为禁用状态。
当前首项用 ListItem 呈现阅读入口；信息流卡片布局、分类筛选搜索尚未完成。
公共校园状态两项缺口仍交甲修复，与本轮无改动。

## 5. 下一步

本首项待用户验收。确认后推进指南任务 02 的分页与状态。
