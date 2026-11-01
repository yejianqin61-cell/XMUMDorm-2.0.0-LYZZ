# 校园快讯管理：前端集成与接口缺口

入口为现有后台侧栏「校园快讯管理」，复用 AdminLayout 和 Toast。
没有新增账号、角色、数据库或后台外壳，没有调用旧组织发布 API。

## 页面

- `/myzone/admin/campus-news`：共享列表、搜索、分类/生命周期筛选、20 条分页、发布与撤回。
- `/myzone/admin/campus-news/new`：新建，完整字段可直接发布，不完整可保存草稿。
- `/myzone/admin/campus-news/:id/edit`：共用编辑表单；已发布保存立即生效，撤回内容保存仍保持撤回。
- `/myzone/admin/campus-news/:id`：后台只读详情，包括隐藏/软删除标记。
- `/myzone/admin/campus-news/:id/versions`：只读快照、图片顺序、两个版本的字段比较。

正常运行不使用 Mock。缺失接口显示失败，不回退到演示记录。
新建表单可在真实管理员通过现有身份查询后查看；编辑/历史页面需对应接口响应。

## 对接契约（01C 已编写后端；真实数据库联调受迁移批准阻塞）

所有接口使用 `{ status: 0, data: ... }` 和正确 HTTP 状态；失败返回非 2xx 或非零 status。
具体字段见 `contracts.d.ts`。后端实现位于 `routes/campusNews.js` 和 `services/campusNews/`，候选 schema 尚未执行。

| 方法 | 路径 | 返回/用途 |
| --- | --- | --- |
| GET | `/api/admin/campus-news?search=&category=&status=&page=1&pageSize=20` | `{items: CampusNews[], total}` |
| GET | `/api/admin/campus-news/colleges` | `{items: {id:string, code, name}[]}`，统一学院目录的适配入口 |
| GET | `/api/admin/campus-news/:id` | `CampusNews` |
| POST | `/api/admin/campus-news/drafts` | 不完整草稿，返回保存后的 `CampusNews` |
| POST | `/api/admin/campus-news/publish` | 完整内容直接发布 |
| PUT | `/api/admin/campus-news/:id` | 内容 + expectedRevision；不改变生命周期 |
| POST | `/api/admin/campus-news/:id/publish` | `{expectedRevision}`，发布/重新发布 |
| POST | `/api/admin/campus-news/:id/withdraw` | `{expectedRevision}`，撤回 |
| GET | `/api/admin/campus-news/:id/versions` | `{items: NewsVersion[]}` |
| GET | `/api/admin/campus-news/:id/versions/compare?from=0&to=1` | `VersionComparison` |
| POST | `/api/admin/campus-news/images` | FormData `image` 单文件；返回不可变 `{id,url,alt?}` |

`colleges` 等静态路由需要在后端 `/:id` 前挂载。学院目录仅有此一处服务端来源，前端没有学院名称副本。
学院 ID 使用字符串；显示名独立。all 与 colleges 互斥，colleges 支持多个 ID。
正文是纯文本，React 转义显示，不使用 `dangerouslySetInnerHTML`。
分类代码 competition / lecture / campus-life，由后端适配最终存储枚举。
写入不提交 sourceKind、生命周期、隐藏/删除字段，服务端必须独立拒绝这些越权字段。
图片 ID 数组次序即保存次序；上传按顺序逐个进行，XHR 显示真实字节进度，100% 后仍等待服务器确认。
最多十图、JPEG/PNG/WebP、单图 8 MiB 是当前前端契约，服务器须另行校验；旧校园上传仍最多三图，未被修改。
移除缩略图不发送删除对象请求，不覆盖历史 Key。服务器尚需实现不可变资产、引用保护和失败/孤立上传清理。

## 错误与并发

- HTTP/业务失败或响应结构错误不会提示保存成功。
- 编辑和状态操作携带 expectedRevision；成功响应须保持预期状态，revision 恰好加一。
- 409 锁定当前编辑器写入，明确确认丢弃本地修改后才重新读取服务器记录。
- 表单状态与同步锁防止本页重复提交；网络超时后的幂等/查证仍须后端支持。
- 已有记录必须先保存编辑内容，才能发布或撤回，避免两次写入中间失败造成误导。
- 隐藏项不能发布/撤回；软删除和 legacy 项只读，无恢复按钮。
- 返回列表和关闭/刷新浏览器有未保存提示；公共后台导航和浏览器站内后退没有统一离开拦截，切换前需先保存。

## 权限边界与真实 API

唯一复用的已有真实 API 为 `GET /api/users/me`（shared requestRaw），用于二次前端门禁。
父 AdminLayout 继续使用现有 isAdmin；本模块补充身份查询、30 秒刷新、窗口聚焦刷新以及 401/403 提示。
此接口在服务端可能缓存 15 秒，不能证明撤权即时生效，也不代替后端授权。
01C 已编写上述 campus-news API；每个管理员请求复查数据库当前 role/status，写入事务内再次持有用户共享锁。
生命周期、受众、expectedRevision、行锁、完整快照及审计在服务层实现；尚未进行真实 MySQL 写入验证。
旧历史 baseline 可返回 audience.scope=unclassified，仅供只读展示“历史受众尚未补录”，不可作为新快讯受众提交。
图片使用 15 分钟单资产签名 URL；查看时再次核对数据库用户和公开状态。历史保存不可变 Key，不保存访问签名。
另有 hide/unhide、DELETE、人工 classify、legacy 列表与孤立资产只读检查接口，当前 UI 未增加这些操作按钮。
学生端真实信息流 API 已增加 `/api/campus-news`，但 Stage 1 仍未切换到真实数据；本轮未改 Stage 1。

## 验证

仓库根目录运行：

```powershell
node --test frontend/src/features/admin-campus-news/adminCampusNews.test.mjs
node node_modules/typescript/bin/tsc --noEmit --skipLibCheck --lib ES2022,DOM frontend/src/features/admin-campus-news/contracts.d.ts
```

frontend 目录运行定向 Lint：

```powershell
node node_modules/eslint/bin/eslint.js src/features/admin-campus-news src/components/Admin/AdminSidebar.jsx src/App.jsx
```

测试使用内存响应、JSX 内存编译和服务器端渲染，不启动服务、不访问数据库/网络。
声明检查只覆盖本模块接口声明，不是全站 TypeScript 检查。
人工需验证桌面/移动端布局、文件选择/大图、输入与排序、确认框、切换页面时的未保存内容。
真实保存、上传、权限即时撤销、版本快照与学生端更新须待后端对接后进行端到端验收。
