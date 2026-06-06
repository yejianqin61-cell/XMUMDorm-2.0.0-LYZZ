# 移动端 App 基础架构评估报告

**项目：** Dorm · XMUMDorm-2.0.0-LYZZ  
**评估日期：** 2026-06-01  
**评估对象：** `mobile/` Expo React Native 项目

---

## 一、架构设计总览

```
mobile/
├── App.tsx                      # 应用入口：SafeArea + StatusBar + Providers
├── index.ts                     # Expo 入口：registerRootComponent
├── app.json                     # Expo 配置（scheme、权限、插件）
├── tsconfig.json                # TypeScript 配置
│
├── src/
│   ├── api/            (22)     # API 请求层 ← 全部从 Web 搬运
│   │   ├── client.ts   ★        # 统一封装（apiGet/apiPost/apiDelete/apiPatch）
│   │   ├── config.js   ★        # API_BASE_URL + 图片 URL 工具
│   │   ├── request.js  ★        # 原始 fetch 封装（AsyncStorage 适配）
│   │   └── *.js (19)            # 各业务模块 API 函数
│   │
│   ├── context/        (2)      # 全局状态
│   │   ├── AuthContext.tsx ★     # 登录态管理（AsyncStorage 持久化）
│   │   └── LanguageContext.tsx   # 中英切换
│   │
│   ├── components/     (8)      # UI 组件层
│   │   ├── ui/ (5)     ★        # 基础组件：GlassView/Button/Input/Card/EmptyState
│   │   ├── PostCard.tsx          # Web 版 PostCard（列表风格）
│   │   ├── PostCardWaterfall.tsx★# 瀑布流 PostCard（当前主力）
│   │   └── TreeholeSkeletonCard  # 加载骨架屏
│   │
│   ├── screens/        (8)      # 页面层
│   │   ├── TreeholeScreen.tsx ★  # 树洞首页（瀑布流+Tag栏+头部+FAB）
│   │   ├── PostDetailModal.tsx ★ # 帖子详情弹窗（点赞+评论）
│   │   ├── NewPostModal.tsx ★    # 发帖弹窗（文字+图片上传）
│   │   ├── LoginScreen.tsx ★    # 登录页
│   │   └── EatScreen/SquareScreen/MyZoneScreen/MailboxScreen (占位)
│   │
│   └── theme/          (1)      # 主题常量
│       └── treehole.ts           # 树洞页专用主题配置
```

**★ = 核心已完成文件**  
**总代码量：约 2,200 行（不含 node_modules）**

---

## 二、分层评估

### 2.1 入口与配置层

| 文件 | 行数 | 完成度 | 说明 |
|------|------|--------|------|
| `App.tsx` | 60 | ✅ 90% | `SafeAreaProvider` → `LanguageProvider` → `AuthProvider` → `MainApp`（Tab 导航 + 登录态路由） |
| `index.ts` | 3 | ✅ 100% | `registerRootComponent(App)` |
| `app.json` | 48 | ✅ 90% | `expo-image-picker` + `expo-notifications` 插件已配，缺 `expo-router` 已移除 |

**缺失项：**
- `expo-linear-gradient` 插件未注册（当前 TreeholeScreen 已使用了它，可能在 Expo Go 中不工作）
- `expo-blur` 插件未注册（PostCardWaterfall 已使用）
- 缺少 `.env` 环境变量管理

### 2.2 API 请求层

| 子层 | 文件数 | 完成度 | 说明 |
|------|--------|--------|------|
| 业务 API | 19 | ✅ 100% | 直接从 Web `frontend/src/api/` 复制 |
| 统一封装 | `client.ts` | ✅ 100% | `apiGet/apiPost/apiDelete/apiPatch`，自动带 token |
| 原始封装 | `request.js` | ✅ 100% | 已适配 `AsyncStorage` 异步读 token |
| 配置 | `config.js` | ✅ 100% | `API_BASE_URL` 已设为 `10.72.10.97:4040` |

**架构评价：⭐⭐⭐⭐⭐**  
API 层是迁移最成功的部分。`client.ts` 提供了简洁的接口（`apiGet('/api/posts?page=1')`），TreeholeScreen 和 PostDetailModal 都在使用。但部分 Screen 仍直接使用 `apiGet/apiPost` 而非 `client.ts`，存在两套调用方式。

### 2.3 全局状态层（Context）

| Context | 行数 | 完成度 | 说明 |
|---------|------|--------|------|
| `AuthContext.tsx` | 98 | ✅ 90% | `login/logout/useAuth`，AsyncStorage 持久化，启动恢复登录态 |
| `LanguageContext.tsx` | 28 | ✅ 90% | `lang/setLang/toggleLang`，中英切换 |

**缺失项：**
- `ToastContext` 未迁移（Web 用 Framer Motion toast，RN 需用 `react-native-root-toast`）
- `ExpFeedbackContext` 未迁移（等级经验反馈弹窗）
- `QueryClientProvider` 未在 App.tsx 中包裹（TanStack Query 已在 `_layout_backup` 中用过，但当前 App.tsx 未用）

### 2.4 UI 组件层

| 组件 | 行数 | 复用度 | 完成度 | 说明 |
|------|------|--------|--------|------|
| `GlassView` | 43 | 🌍 全局 | ✅ 100% | iOS `BlurView` / Android 半透明降级 |
| `StyledButton` | 49 | 🌍 全局 | ✅ 100% | primary/secondary/danger + loading 态 |
| `StyledInput` | 46 | 🌍 全局 | ✅ 100% | label + 输入框 |
| `Card` | 19 | 🌍 全局 | ✅ 100% | 白底圆角阴影卡片 |
| `EmptyState` | 17 | 🌍 全局 | ✅ 100% | 空数据提示 |
| `PostCard` | 186 | 树洞 | ⚠️ 待定 | Web 列表风格 PostCard（已不推荐，瀑布流替代） |
| `PostCardWaterfall` | 356 | 树洞 | ✅ 95% | 封面图+玻璃标签+渐变遮罩+数据统计 |
| `TreeholeSkeletonCard` | 104 | 树洞 | ✅ 100% | 加载骨架屏 |

**架构评价：⭐⭐⭐⭐**  
5 个基础 UI 组件已就绪，可被所有业务模块复用。`PostCardWaterfall` 是最复杂的组件之一（356 行），包含了图片缩略图降级、加载状态、渐变遮罩、iOS/Android 分支等完整逻辑。当前缺失通用骨架屏和图片预览组件。

### 2.5 页面层（Screens）

| Screen | 行数 | 完成度 | 说明 |
|--------|------|--------|------|
| `TreeholeScreen` | 548 | ✅ 85% | 头部+Tag栏+瀑布流+FAB+无限滚动+顶部按钮+刷新 |
| `PostDetailModal` | 175 | ✅ 80% | 帖子详情+点赞+评论列表+发表评论 |
| `NewPostModal` | 73 | ✅ 80% | 文字输入+图片选择+发布 |
| `LoginScreen` | 46 | ✅ 90% | 学号/邮箱+密码登录 |
| `EatScreen` | 46 | ⚠️ 10% | 仅显示区域列表 |
| `SquareScreen` | 17 | ❌ 0% | 纯占位 |
| `MyZoneScreen` | 33 | ⚠️ 15% | 显示用户名+退出按钮 |
| `MailboxScreen` | 17 | ❌ 0% | 纯占位 |

**架构评价：⭐⭐⭐**  
树洞模块接近完成（85%），但其余 7 个 Screen 中 4 个是纯占位。Navigation 层未独立——Tab 切换逻辑内联在 `App.tsx` 中（60 行全塞一个文件）。

---

## 三、架构健康度检查

### 3.1 已做到 ✅

| 项 | 说明 |
|----|------|
| Provider 层级 | `SafeAreaProvider` → `LanguageProvider` → `AuthProvider` 层次清晰 |
| API 层分离 | `src/api/` 独立于 UI，20 个文件完整 |
| 组件复用 | 5 个基础 UI 组件 + 2 个业务组件，接口一致 |
| 登录态路由 | `isLoggedIn ? MainApp : LoginScreen`，简洁有效 |
| 主题常量化 | `src/theme/treehole.ts` 抽离间距/颜色 |
| AsyncStorage 适配 | `request.js` 和 `AuthContext` 均已改用 AsyncStorage |
| TypeScript | 全部新文件使用 `.tsx` |

### 3.2 待改进 ⚠️

| 项 | 影响 | 建议 |
|----|------|------|
| Screen 与 Tab 耦合在 App.tsx | 低 | 抽 `src/navigation/TabNavigator.tsx` |
| `expo-linear-gradient` 未注册插件 | 高 | 在 `app.json` 添加 `expo-linear-gradient` 插件 |
| `expo-blur` 未注册插件 | 中 | 在 `app.json` 添加 |
| 缺少 TanStack Query 集成 | 中 | `App.tsx` 包裹 `QueryClientProvider`，Treehole 已用原生 fetch |
| 缺少 Toast 通知 | 中 | 迁移 `ToastContext`，点赞/评论/发帖操作需反馈 |
| 缺少 Navigation 库 | 中 | 当前用 `useState('treehole')` 做 Tab 切换，无动画、无 Stack |
| 两套 API 调用方式并存 | 低 | Screen 直接调 `apiGet` vs `client.ts` 的封装，统一为后者 |
| `config.js` IP 硬编码 | 低 | 改为环境变量或 `app.json` extra 字段 |

---

## 四、骨架建设进度评分

| 维度 | 完成度 | 评分 | 说明 |
|------|--------|------|------|
| **入口与配置** | 90% | ⭐⭐⭐⭐½ | 缺 LinearGradient/Blur 插件注册 |
| **API 请求层** | 100% | ⭐⭐⭐⭐⭐ | 20 个业务文件 + 2 个封装，完全就绪 |
| **全局状态层** | 50% | ⭐⭐½ | Auth + Language 就绪，缺 Toast + ExpFeedback + QueryClient |
| **UI 组件层** | 45% | ⭐⭐ | 5/14 共享组件，3/45 业务组件 |
| **页面层** | 15% | ⭐ | 1/8 Screen 接近完成，4/8 为占位 |
| **路由导航** | 30% | ⭐½ | Tab 切换可用但无动画、无 Stack、无 Deep Link |
| **主题系统** | 20% | ⭐ | 仅树洞页有 `treehole.ts`，其余未抽取 |
| **推送系统** | 0% | — | 未迁移 |

### 综合骨架完成度：**约 35%**

---

## 五、下一步行动（按优先级）

| 优先级 | 行动 | 工时 | 影响范围 |
|--------|------|------|----------|
| 🔴 P0 | `app.json` 注册 `expo-linear-gradient` 和 `expo-blur` 插件 | 10min | 修复当前树洞页可能不工作的渐变/模糊效果 |
| 🔴 P0 | `App.tsx` 包裹 `QueryClientProvider` | 10min | 为 TanStack Query 缓存做准备 |
| 🟡 P1 | 抽 `src/navigation/TabNavigator.tsx` | 30min | 解耦 App.tsx |
| 🟡 P1 | 迁移 `ToastContext` | 1h | 全局操作反馈 |
| 🟡 P1 | 完成 TreeholeScreen 剩余 15% | 2h | TagPanel + 搜索页 + 真正的 Tag API 对接 |
| 🟢 P2 | `config.js` IP 改用 `app.json` extra | 15min | 方便切换开发/生产环境 |
| 🟢 P2 | 统一 API 调用方式（全用 `client.ts`） | 1h | 代码一致性 |
| 🟢 P3 | 迁移 `ExpFeedbackContext` | 1h | 等级升级弹窗 |

---

## 六、与 Web 版的架构对照

| Web 层 | Web 实现 | RN 层 | RN 实现 | 对齐度 |
|--------|----------|-------|---------|--------|
| 路由 | React Router v6 | 自建 Tab | ❌ 简易版 | 30% |
| 状态 | TanStack Query + AuthContext | AuthContext + fetch | ⚠️ 缺少 Query | 50% |
| 样式 | CSS Modules + Tailwind | StyleSheet.create | ✅ 已定规范 | 90% |
| 动画 | Framer Motion | 无 | ❌ 缺失 | 0% |
| 组件 | 60+ JSX | 8 TSX | ⚠️ 初期 | 13% |
| API | 20 文件 | 22 文件 | ✅ 完全对齐 | 100% |
| Context | 4 个 | 2 个 | ⚠️ 缺 Toast + Exp | 50% |
| 构建 | Vite | Metro (Expo) | ✅ 可用 | 90% |

**综合对齐度：约 40%**

---

**报告编写：** Claude Code (Claude Opus 4.8)  
**最后更新：** 2026-06-01
