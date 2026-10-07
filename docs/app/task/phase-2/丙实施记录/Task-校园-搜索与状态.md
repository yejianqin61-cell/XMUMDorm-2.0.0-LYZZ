# 校园任务 04：四态双语复核，搜索待公共骨架

日期：2026-10-07。分支：dev-zjr。状态：四态复核已交付，搜索页面未实现。

## 本轮交付

新增 19 项测试：树洞加载、业务空态、有数据与末页、断网/服务不可达/超时及重试恢复；万能墙空态、有数据及匿名保护，均在中文与英文环境验证。另 3 项验证现有 getPostList 搜索契约：q 去首尾空白及编码、空白不发 q、翻页保持 q 和已有令牌入口。

测试直接渲染现有 CampusListScreen，通过既有公共 ListScreen 和 mock 共享 API 验证页面。加载不误报空态；失败不显示内部地址；恢复重新请求第一页。这一轮没有改业务运行代码，也没有构造公共替代搜索页。

## 公共接缝缺口

计划 docs/app/task/phase-2/README.md 第 143–145 行明确 C-03 搜索复用 P14 且不新增接缝。当前 app/src/proto 只有 P3/P11/P16；全 src 没有公共搜索页面骨架。SearchField 是输入控件，不能据此认定 P14 页面已存在。

因此搜索页面、入口、搜索分页缓存和旧搜索请求竞争仍未实现，不能用参数契约测试冒充完成。按用户既有分工，公共骨架缺口留给甲；没有向甲发送消息。

依据 easy-task-act 的 Stop and ask 条款："The seam the plan named does not exist, or sits lower than the plan claimed." 本项搜索依赖暂停；四态等独立复核继续完成。此依据是技能的明确要求，同时与任务 brief 的“公开接缝不足，记录缺口并暂停依赖部分”一致。

待 P14 交付后接 getPostList({q,page,pageSize})：提交关键词后从第一页读取，变更关键词隔离旧请求，失败重试当前请求，无结果用业务空态。这是待实现列表，不是本轮交付。

## 检查结果与边界

- 校园相关 3 套、54 项通过（原 35 项 + 本轮 19 项）。
- 全量 59 套通过、2 套跳过；1176 项通过、16 项跳过。
- npm run typecheck、四项 rulers、git diff --check 通过。
- 无 lint 配置或已安装的 lint 工具；不宣称 lint 通过。
- 日志在工作区 work/xmumdorm/campus-search-state.log、campus-search-full.log、campus-search-rulers.log。
- 未访问云数据库；请求均为模拟。中英文测试不等于原生设备、键盘或实际网络验收。
- 本轮提交本地 dev-zjr，不 push、不建 PR。
