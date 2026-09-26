# 	Dorm 组织系统设计文档（V3.0）

**项目：** Dorm
**模块：** Organization System（组织系统）
**开发阶段：** V3.0
**设计目标：**

建立校园组织体系，使学校部门、学院、社团等能够以组织身份进行内容发布和管理。

------

# 一、设计目标

当前用户角色：

```
Student
Merchant
Admin
```

保持不变。

不新增：

```
SchoolDepartment
College
Advisor
```

等角色。

原因：

角色负责权限控制。

组织负责身份表达。

------

# 二、系统架构

系统结构：

```
User
    ↓
Membership
    ↓
Organization
```

------

## User（用户）

表示真实的人。

基础结构：

```
用户

姓名
头像
基础角色
```

角色：

```
Student
Merchant
Admin
```

------

## Organization（组织）

表示校园组织实体。

组织类型：

```
SchoolDepartment
College
Official
```

说明：

| 类型             | 说明         |
| ---------------- | ------------ |
| SchoolDepartment | 学校行政部门 |
| College          | 学院         |
|                  |              |
| Official         | Dorm官方     |

------

组织示例：

```
学生事务处

财政部门

招生办

计算机科学学院

ACM协会

Dorm官方
```

------

## Membership（组织成员关系）

用于记录：

```
用户
↓
属于哪个组织
↓
在组织中的职位
```

字段：

```
用户

组织

职位

权限等级
```

示例：

```
Fong

↓

财政部门

职位：

主管
```

```
Fong

↓

招生办

职位：

主任
```

```
Fong

↓

Computer Science

职位：

Advisor
```

------

# 三、管理员能力

管理员新增：

## 创建组织

在广场页面 ，管理员可创建：

```
学校行政部门

学院


```

填写：

```
组织名称

头像

描述

组织类型
```

------

## 添加组织成员

管理员支持：

```
搜索用户，通过邮箱搜索
```

并加入组织。

示例：

```
搜索：

Fong

↓

加入：

财政部门

职位：

主管
```

------

## 编辑组织成员

管理员可：

```
修改职位

移除成员

调整权限
```

------

# 四、组织身份发布机制

## 发帖入口，指的是广场页面的校园此刻

当用户属于多个组织时：

举个例子：

发布页面显示：

```
发布身份


○ 财政部门（只在学校官方通知tab的发帖界面的选择身份中出现

○ 招生办（只在学校官方通知tab的发帖界面的选择身份中出现

○ Computer Science Advisor（只在学院tab的发帖界面的选择身份中出现）
```

用户选择后发布。

------

## 发布结果

### 

------

### 组织身份

显示：

```
📢 财政部门（官方认证）

奖学金发放通知
```

或：

```
📢 招生办（官方认证）

交换项目申请开放
```

------

# 五、校园此刻动态流调整

原：

```
[学校公告]
[学生组织]
[社团]
[出物]
[帮帮我]
```

调整：

```
[学校公告]
[学院通知]

```

------

## 学校公告

来源：

```
SchoolDepartment
Official
```

示例：

```
宿舍停水通知

奖学金通知

校历更新
```

------

## 学院通知

来源：

```
College
```

示例：

```
计算机学院：

课程调整通知

电子工程学院：

毕业设计安排
```

------

## 



------

# 六、用户流程

```
管理员创建组织

↓

管理员添加成员

↓

成员拥有组织身份

↓

发布帖子

↓

选择发布身份

↓

动态流显示组织来源
```

------

# 七、V3.1 后续扩展（预留）

### 组织关注

```
关注：

计算机学院
招生办
ACM协会
```

------

### 组织主页

```
组织信息

公告

帖子

活动

成员
```

------

### 组织权限等级

------

## 八、回归修复记录

### 8.1 活动详情页失去全部样式（2026-09-26 修复）

**现象**：`/about/club/activity/:id`（`ActivityDetail.jsx`）整个页面失去样式——
标题、社团名、活动正文挤成左上角的小字，地点/报名数/截止时间挤成一行行无间距文本，
「加入日历 / 加入待办」退化成纯文字，封面图失去约束、撑满一屏。

**根因**：提交 `5ba330a`「feat(clubs): replace club pages with neobrutalism (retroui) components」
把 `frontend/src/pages/Clubs/Clubs.css` 整体重写（**−1385 / +574 行**），并按清单迁移了
`ClubPostDetail` / `ClubProfile` / `ClubsHome` / `ClubListPage` / `ClubMembersPage` /
`CreateClub` / `MyClubs` / `PublishClubPost` / `ClubCommentsSection` —— **`ActivityDetail.jsx` 不在该清单内**，
但它依赖的 6 个旧类名被一并删除了：

| 被删类名 | 作用 |
|----------|------|
| `.club-feed-title` | 活动标题排版 |
| `.club-detail-meta` | 活动元信息栅格（地点/报名数/截止时间） |
| `.club-detail-loc` | 地点行的 inline-flex 对齐 |
| `.club-detail-utility-btn` | 「加入日历 / 加入待办」胶囊按钮 |
| `.club-like-btn` / `.club-like-btn.is-on` | 点赞按钮及选中态 |
| `.club-delete-btn`（含 `--compact` / `--icon-only`） | 删除按钮 |

**修复（最终）**：由 `d58d753`「feat(frontend): refresh club activity detail UI」**把 `ActivityDetail.jsx`
正式迁移到新样式**（改写 JSX 127 行、`Clubs.css` 增补 288 行）解决。
迁移后该页不再引用上述任何一个旧类名，核对新 JSX 的 35 个类名，除 Tailwind 工具类
`text-slate-400` 外全部有定义。

**一次并行的重复修复（记录备查）**：在同一时间窗内，另一个执行者（M09 万能墙的迭代）
也独立定位到了同一根因，并采取了「按 `5ba330a^` 原定义恢复这 6 个类」的修法，
在 1440×900 浏览器实测通过（元信息恢复栅格、地点行恢复图标对齐、两个按钮恢复胶囊样式）。
随后发现 `d58d753` 已在 main 上完成正式迁移，该恢复被判定为**冗余**并在合并 main 时撤销
（`Clubs.css` 取 main 版本）。两条独立路径得出同一根因结论，可作为该诊断的交叉验证。

**后续规约**：清理页面级 CSS 时必须先确认类名**是否仍被任一未迁移页面引用**；
本次是「整文件重写」而非「按引用删除」造成的连带删除。
若后续还要迁移某页，应先迁移 JSX 再删旧规则（`d58d753` 就是这个顺序）。

### 8.2 活动详情页冷启动白屏（2026-09-26 修复）

**现象**：**直接打开或刷新** `/about/club/activity/:id` 整页白屏（`body` 文本长度为 0）；
从列表页点进去却正常。

**根因**：`d58d753` 在**守护语句之前**新增了一行未加可选链的解引用：

```jsx
L244  const statusLabel = String(a.status || '').toLowerCase() === 'ended' …
L269  if (q.isLoading) return <div className="state-loading">…</div>;
L270  if (q.isError || !a) return <div className="state-error">…</div>;
```

冷启动时查询仍是 `pending`，`a === undefined` → 抛
`TypeError: Cannot read properties of undefined (reading 'status')` →
React 卸载整个 `<ActivityDetail>` → 白屏。
从列表页进入时 TanStack Query 已有缓存、`a` 立即可用，因此**不复现**——
这正是「只有刷新/直链才白屏」的原因，也是它容易被漏掉的原因。

**修复**：`L244` 改为 `a?.status`，并加注释标明该行位于早退守卫之前、必须用可选链。

**规约**：组件内所有「从查询结果派生的常量」若写在早退（`isLoading` / `isError` / `!data`）
**之前**，一律使用可选链；否则数据未到达时的第一次渲染必然抛错，而缓存命中会掩盖它。
新增此类派生逻辑后，必须用**直链/刷新**验证一次，不能只从列表页点进去验证。


