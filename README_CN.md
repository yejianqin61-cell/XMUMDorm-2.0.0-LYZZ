# XMUMDorm（厦马小筑）

> 厦门大学马来西亚分校（XMUM）校园社交与生活一站式平台
>
> **生产环境**: https://xmumdorm-200-lyzz-production.up.railway.app
> **开发者**: Ye Jianqin（CST2509054）

---

## 项目概述

XMUMDorm 是一款专为 XMUM 校园生态设计的一站式应用，覆盖社交、饮食、学习、生活四大场景。项目采用 **Spec-Driven（文档驱动）+ Agent-Native（智能体原生）** 架构，遵循 10 阶段软件工程生命周期方法论。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **后端运行时** | Node.js + Express | 17 个路由模块，RESTful API |
| **数据库** | MySQL | 57 个增量迁移，参数化查询，逻辑删除 |
| **鉴权** | JWT | Bearer Token，角色体系（student/merchant/admin） |
| **Web 前端** | React 19 + Vite 7 + React Router | 99 页面，TanStack Query 状态管理，CSS 液态玻璃设计 |
| **移动端 App** | Capacitor 8 + Android | Web 代码 100% 复用打包为原生 APK，iOS 项目就绪 |
| **消息推送** | 极光推送 (JPush) | iOS APNs / Android 华为/小米/OPPO/vivo/FCM 全厂商通道 |
| **状态管理** | TanStack Query (React Query v5) | 服务端缓存 + 乐观更新 |
| **样式体系** | CSS Modules + Tailwind CSS 4 + 液态玻璃 (backdrop-filter) | 245 处 blur/glass 效果 |
| **图片存储** | Cloudflare R2 (S3 兼容) | 对象存储 + CDN 分发 |
| **测试框架** | Jest 30 + Supertest | 108 用例，100% 通过率 |
| **CI/CD** | Railway (后端) + Git | 自动部署 |
| **国际化** | 中英双语 | LanguageContext + 双语 Tag 系统 |

---

## 功能模块

### 🏠 认证系统
- 学号/邮箱 + 密码登录
- 学生/商家双角色注册
- JWT 鉴权 + 游客模式
- 邮箱验证码
- 路由守卫（AuthGuard）

### 🌳 树洞（TreeHole）
校园匿名/实名社交空间
- 文字 + 图片发帖（含 GIF，最多 3 张）
- 二级评论与回复
- 点赞/取消点赞（乐观更新）
- 双语 Tag 系统 + 个人 Tag 定制
- 瀑布流布局 + 无限滚动
- 管理员隐藏/删除

### 🍽️ 食堂（Canteen）
校园食堂信息平台
- 区域 → 店铺 → 分类 → 商品 四级结构
- 商品点评（含图片 + 评分）
- 分区排行榜（综合评分）
- 吃货广场（瀑布流帖子）
- 收藏 + 搜索
- 商家管理端（店铺/商品 CRUD）

### 🏛️ 广场（Square）
校园信息聚合中心
- 热搜榜（帖子流）
- 校园此刻（实时动态）
- 全屏轮播图
- 四宫格功能入口
- 评论 + 点赞系统

### 👥 社团（Clubs）
- 创建/加入/关注社团
- 社团动态发布
- 成员管理
- 社团广场

### 🛒 二手市场（Marketplace）
- 分类 Tab + 筛选
- 商品发布（最多 4 图）
- 收藏 + 搜索
- 买家/卖家聊天
- 状态管理（待售/已售出）

### 🏃 跑腿（Errands）
- 任务发布与接单
- 状态跟踪

### 📚 一站通（Handbook）
- 新生手册文章系统
- 评论/收藏/点赞
- 文章编辑器

### 📝 课程评价（Course Review）
- 学期制匿名评价
- 评分 + 标签 + 评论
- 可编辑/删除

### 📅 课程表（Schedule）
- 周视图课程展示
- 今日课程
- 课前提醒

### ⭐ 等级系统（Level System）
- 经验值累积（发帖/评论/点赞/签到）
- 等级徽章 + 进度条
- 升级弹窗特效
- 排行榜

### ✅ 待办（Todo）
- 今日待办 CRUD
- 完成状态切换

### 📓 日记（Diary）
- 日记 CRUD
- "往年今日"功能

### 🔔 通知 & 推送
- 6 模块分类通知信箱
- 极光推送（JPush）全平台覆盖
- iOS: APNs | Android: 华为/小米/OPPO/vivo/FCM 厂商通道
- Web Push (PWA)

### 🛡️ 管理员后台
- Dashboard 数据面板
- 用户管理（列表/详情/封禁/禁言）
- 举报审核中心
- 内容管理（8 模块统一后台）
- 系统公告管理
- 敏感词配置
- 审计日志

### 📄 其他
- 隐私政策 + 用户协议（`/privacy` `/terms`）
- 中英双语切换
- PWA 支持（离线可用）
- 液态玻璃设计（245 处 backdrop-filter/blur）

---

## 开发历程

### 项目时间线

```
2026.01.27 ─── 项目启动，认证模块完成
2026.01-02  ── 帖子系统 + 食堂系统 + 排行榜后端
2026.03      ── 前端全面开发（99 页面）+ React Router + TanStack Query
2026.03.10   ── Railway 首次上线生产环境
2026.03-04   ── 持续优化：UI 重构 · 性能优化 · 双语模式 · 液态玻璃
2026.04      ── 新生手册 · 课程评价 · 二手市场 · 跑腿 · 社团 · 通知/推送
2026.05      ── 管理员后台 · 举报系统 · 等级系统 · 敏感词过滤
2026.05.31   ── 测试框架建立（108 用例 100% 通过）
2026.06.01   ── React Native 移动端开发（69 Screens + 416 测试）
2026.06.06   ── Agent-Native 架构 · Spec-Driven 文档中心重组
2026.06.07   ── 战略转向 Capacitor 打包 · Android APK 真机运行
2026.06.08   ── Release 签名 · JPush 极光推送 · 隐私政策 · 商店上架准备
```

### 关键数据

| 指标 | 数值 |
|------|------|
| 总提交数 | **288 commits** |
| 开发周期 | **2026.01.27 – 2026.06.08（4.5 个月）** |
| 后端代码 | 17 routes + 5 middleware + 7 services ≈ **17,000 行** |
| 前端代码 | 99 pages + 60 components ≈ **30,000 行** |
| 移动端代码 | 69 screens + 416 tests ≈ **14,000 行** |
| 测试 | 108 用例 (后端) + 416 用例 (移动端) = **524 用例** |
| 数据库迁移 | **57 个**增量迁移 |
| 文档体系 | **100+** 份 Markdown/HTML 文档 |

---

## 生产环境

### 当前运行状态

| 服务 | 状态 | 地址 |
|------|:--:|------|
| 后端 API | 🟢 运行中 | `xmumdorm-200-lyzz-production.up.railway.app` |
| Web 前端 | 🟢 运行中 | 同上（同一域名） |
| MySQL 数据库 | 🟢 运行中 | Railway MySQL 托管 |
| 对象存储 | 🟢 运行中 | Cloudflare R2 |
| 邮件服务 | 🟢 运行中 | SMTP (Office 365 @xmu.edu.my) |
| Android App | 🟢 APK 就绪 | Release 签名 38MB |
| 推送服务 | 🟡 配置中 | JPush 极光推送 (AppKey 已配) |

### Android App

- **构建方式**: Capacitor 8 — Web 代码 100% 复用，打包为原生 APK
- **签名**: Release 签名 + 自动化构建
- **Safe Area**: 跨平台适配完成（JS 原生高度注入 + CSS 100dvh）
- **推送**: 极光推送（华为/小米/OPPO/vivo/FCM/APNs 全厂商通道）
- **商店**: 国内应用商店 + Google Play 准备中

---

## 运行项目

### 后端
```bash
npm install
# 配置 .env（参考 .env.example）
npm start          # 生产模式
npm run dev        # 开发模式 (nodemon)
```

### Web 前端
```bash
cd frontend
npm install
npm run dev        # Vite 开发服务器 (localhost:5173)
npm run build      # 生产构建
```

### Android App
```bash
npm run build:capacitor    # 构建 Capacitor 版本
npx cap sync android       # 同步到 Android 项目
npx cap open android       # 在 Android Studio 中打开
# Build → Build APK
```

### 测试
```bash
npm test                   # 108 用例集成测试
```

---

## 许可证

本项目为厦门大学马来西亚分校学生个人项目。保留所有权利。

---

*最后更新: 2026-06-08 · 开发者: Ye Jianqin · 联系方式: yejianqin61@gmail.com*
