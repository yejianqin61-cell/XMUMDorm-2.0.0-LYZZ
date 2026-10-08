# Wave B · 乙批次小结

## 1. Headline and changes

四张页面的独立实现已落地：待办可增删改勾选，工具仪表盘有真数据，文字点评可提交，食堂检索能区分业务空态与网络失败。

| 任务 | 状态 | 证据 |
|---|---|---|
| P2Y-B01 待办 | 已提交 | 2 suites/48 tests、typecheck exit0；`5e646f4` |
| P2Y-B02 工具仪表盘 | 已提交 | 4 suites/104 tests、typecheck exit0；`128060e` |
| P2Y-B03 五档点评 | 已提交 | 3 suites/49 tests、typecheck exit0；`33adfe8` |
| P2Y-B04 食堂检索 | 已验证 | 3 suites/87 tests、typecheck exit0 |

## 2. What the changes mean

新增 `/tools/dashboard`、`/tools/todos`、`/tools/todos/new`、`/tools/todos/[id]`、`/canteen/review/[id]`、`/canteen/search`。仪表盘采用dashboard路径，避免与已有 `/tools` Tab 重名。公共工具Tab接线留在最后。

所有写动作复用既有 API；创建/编辑使用K01，列表使用K05。优先级在页内筛选；服务端无单条待办读取接口，编辑从现有分页端点查找。点评成功后失效食堂整个读域；失败保留正文，重复提交由K01阻止。搜索1–50字符才发请求，关键词变化会废弃旧响应，文章先只读展示，避免跳未交付路由。

## 3. What is still open

公共T01入口、S10写路径归属、图片依赖准入及日期时间平台组件仍待最后裁决。当前日期时间是受校验输入；图片选择没有原生实现。分类复用现有C14，K22尚未交付，不能宣称K22完成。

下一批接公开读缓存、导入400修正提示和逐页验收。未做真机、读屏、原生返回栈验证；App全量及根测试安排在末批。
