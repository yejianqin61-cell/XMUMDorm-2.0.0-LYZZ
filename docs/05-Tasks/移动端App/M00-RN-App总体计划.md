# XMUMDorm React Native App 开发计划（V1.0）

**项目：** Dorm · XMUMDorm-2.0.0-LYZZ  
**编写日期：** 2026-06-01  
**编写目的：** 在保留现有 Web 版的前提下，用 React Native（Expo）开发移动端 App，后端 95%+ 复用，前端 UI 复刻 Web 版。

---

## 0. 战略定位

```
                ┌─────────────────────┐
                │   Express 后端 API   │
                │   (routes/ 17个文件) │
                │   几乎零改动           │
                └──────┬──────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
     ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
     │   Web   │ │   App   │ │   …     │
     │ (React) │ │  (RN)   │ │         │
     │ 现有    │ │  新建   │ │         │
     └─────────┘ └─────────┘ └─────────┘
```

- **后端复用度：95%+**（仅 Web Push → 双通道推送需微调）
- **前端代码复用度：** API 层 100% / Context 层 90% / Utils 层 80% / UI 层 0%（重写但 1:1 复刻）
- **UI 设计：** 1:1 复刻 Web 版，液态玻璃效果用 `expo-blur` 实现

---

## 1. 技术选型

| 层面 | 选型 | 理由 |
|------|------|------|
| 框架 | **Expo SDK 52+** | OTA 热更新、无需 Xcode/Android Studio、内置推送/相机/图片选择器 |
| 路由 | **Expo Router**（文件系统路由） | 与你现有 React Router 结构相似，`app/` 目录下文件即路由 |
| 状态管理 | **TanStack Query**（同 Web） | 已在 Web 端使用，API 逻辑直接搬运 |
| HTTP 请求 | **fetch**（同 Web） | API 层代码直接复用 |
| 本地存储 | **AsyncStorage** | 替代 localStorage，AuthContext 微调即可 |
| 液态玻璃 | **expo-blur** + 半透明 View | iOS 原生模糊，Android 用半透明模拟 |
| 图标 | **lucide-react-native** | 与 Web 端 lucide-react 同源，直接 1:1 映射 |
| 图片 | **expo-image**（FastImage） | 性能优于 RN 原生 Image |
| 推送 | **expo-notifications** | 替代 Web Push，后端新增 FCM 路由 |
| 动画 | **react-native-reanimated** | 替代 Framer Motion |

### 1.1 项目目录结构

```
mobile/
├── app/                          # Expo Router 页面（文件系统路由）
│   ├── _layout.js                # 根布局（Tab Navigator）
│   ├── index.js                  # 首页 = 树洞
│   ├── login.js                  # 登录
│   ├── register.js               # 注册
│   ├── post/
│   │   ├── new.js                # 发帖
│   │   └── [id].js               # 帖子详情
│   ├── square/                   # 广场
│   │   ├── index.js
│   │   ├── trending/
│   │   │   ├── [id].js
│   │   │   └── post/[id].js
│   │   └── campus/
│   │       ├── new.js
│   │       └── [id].js
│   ├── eat/                      # 食堂
│   │   ├── index.js
│   │   ├── [area].js
│   │   ├── merchant/[id].js
│   │   └── food/[id].js
│   ├── clubs/                    # 社团
│   ├── marketplace/              # 二手
│   ├── errands/                  # 跑腿
│   ├── handbook/                 # 一站通
│   ├── myzone/                   # 我的
│   │   ├── index.js
│   │   ├── profile.js
│   │   ├── schedule.js
│   │   ├── diary.js
│   │   ├── todos.js
│   │   └── admin/                # 管理员后台
│   │       ├── index.js
│   │       ├── users/
│   │       └── reports/
│   └── mailbox.js                # 信箱
│
├── src/
│   ├── api/           # ← 从 Web frontend/src/api/ 直接复制
│   ├── context/       # ← 从 Web 复制 + AsyncStorage 适配
│   ├── utils/         # ← 从 Web 复制
│   ├── components/    # RN 组件（重写但结构对应 Web）
│   │   ├── ui/        # 基础 UI（GlassView, Button, Input, Card）
│   │   ├── post/      # PostCard, PostDetailShell
│   │   ├── canteen/   # FoodCard, MerchantCard
│   │   ├── admin/     # AdminLayout, AdminSidebar
│   │   └── report/    # ReportButton
│   └── hooks/         # RN 特有 hooks
│
├── assets/            # 图片、字体
├── app.json           # Expo 配置
└── package.json
```

---

## 2. Web → RN 组件映射表

### 2.1 基础元素

| Web | React Native |
|-----|-------------|
| `<div>` | `<View>` |
| `<p>` / `<span>` | `<Text>` |
| `<img>` | `<Image>` 或 `<expo-image>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<Pressable>` 或 `<TouchableOpacity>` |
| `<Link to={}>` | `<Link href={}>`（Expo Router） |
| CSS `className` | `StyleSheet.create()` 或内联 `style={{}}` |
| CSS `flex` / `grid` | `flexDirection: 'row'/'column'` |
| `overflow-y: auto` | `<ScrollView>` / `<FlatList>` |
| `backdrop-filter: blur()` | `<BlurView>`（expo-blur） |
| `box-shadow` | `shadowColor/Offset/Opacity/Radius` + `elevation`（Android） |
| `position: fixed` | `position: 'absolute'`（需手动计算） |
| `window.innerWidth` | `Dimensions.get('window').width` |

### 2.2 核心组件映射

| Web 组件（60+） | RN 对应 | 复用逻辑 | 需重写 |
|----------------|---------|----------|--------|
| `PostCard.jsx` | `components/post/PostCard.js` | 数据结构 + API 逻辑 | ✅ JSX |
| `PostDetailShell.jsx` | `components/post/PostDetailShell.js` | 评论树 + 点赞逻辑 | ✅ JSX |
| `GlassView`（未独立） | `components/ui/GlassView.js` | 新建通用组件 | 🆕 新建 |
| `ReportButton.jsx` | `components/report/ReportButton.js` | 举报类型映射 | ✅ JSX |
| `AdminLayout.jsx` | `components/admin/AdminLayout.js` | 侧边栏逻辑 | ✅ JSX |
| `AdminSidebar.jsx` | `components/admin/AdminSidebar.js` | 导航配置 | ✅ JSX |
| `FoodCard.jsx` | `components/canteen/FoodCard.js` | 数据结构 | ✅ JSX |
| `Layout.jsx` / `TabBar.jsx` | `app/_layout.js`（Expo Router Tab） | 导航结构 | 🆕 用 Expo Router |
| `AuthContext.jsx` | `context/AuthContext.js` | 90% 复用 | ✅ AsyncStorage |

### 2.3 动画映射

| Web（Framer Motion） | RN（react-native-reanimated） |
|---------------------|------------------------------|
| `motion.div` | `<Animated.View>` |
| `initial={{ opacity: 0 }}` | `useAnimatedStyle(() => ({ opacity: withTiming(1) }))` |
| `whileTap={{ scale: 0.97 }}` | `useAnimatedStyle + withSpring` |
| `staggerChildren` | `entering={FadeIn.duration(300).springify()}` |

---

## 3. 分阶段开发计划

### 第一阶段：基础设施（约 3 天）

**目标：** Expo 项目跑起来，登录/注册可用，树洞首页可浏览。

| 步骤 | 内容 | 预估 |
|------|------|------|
| 1.1 | 初始化 Expo 项目 + TypeScript 配置 | 2h |
| 1.2 | 搬运 `frontend/src/api/` 全部 20 个文件 | 1h |
| 1.3 | 搬运 `frontend/src/context/`（AuthContext 适配 AsyncStorage） | 2h |
| 1.4 | 搬运 `frontend/src/utils/` | 0.5h |
| 1.5 | 创建 `components/ui/GlassView` + `Button` + `Input` + `Card` 基础组件 | 4h |
| 1.6 | 实现登录/注册页（`app/login.js` + `app/register.js`） | 3h |
| 1.7 | 创建 Tab 导航骨架（树洞/食堂/广场/我的/信箱） | 2h |
| 1.8 | 实现树洞首页（`app/index.js` + `PostCard`） | 4h |
| 1.9 | 实现帖子详情（`app/post/[id].js` + `PostDetailShell`） | 4h |
| 1.10 | 实现发帖页（`app/post/new.js`） | 3h |

**交付物：** 登录 → 树洞首页 → 帖子详情 → 发帖 完整闭环。

### 第二阶段：食堂 + 广场（约 4 天）

| 步骤 | 内容 | 预估 |
|------|------|------|
| 2.1 | 食堂首页 + 区域列表 + 店铺列表 | 4h |
| 2.2 | 商品详情 + 点评列表（FoodDetailView） | 3h |
| 2.3 | 发布点评 + 图片上传 | 3h |
| 2.4 | 商家管理端（店铺 + 商品管理） | 3h |
| 2.5 | 广场首页 + 四宫格 | 2h |
| 2.6 | 热搜榜 + 热搜帖子详情 | 3h |
| 2.7 | 校园此刻 + 发帖 | 3h |
| 2.8 | 轮播图组件（BannerCarousel） | 2h |

### 第三阶段：社团 + 二手 + 跑腿 + 一站通（约 4 天）

| 步骤 | 内容 | 预估 |
|------|------|------|
| 3.1 | 社团列表 + 社团主页 | 3h |
| 3.2 | 社团活动 + 帖子 + 评论 | 3h |
| 3.3 | 二手首页 + 商品详情 + 发布 | 3h |
| 3.4 | 二手聊天 | 4h |
| 3.5 | 跑腿首页 + 发单 + 接单 | 2h |
| 3.6 | 一站通文章 + 课程评价 | 3h |
| 3.7 | 课表页面（Schedule） | 2h |

### 第四阶段：个人空间 + 通知 + 管理员后台（约 3 天）

| 步骤 | 内容 | 预估 |
|------|------|------|
| 4.1 | 我的首页（MyZone）+ 统计 | 3h |
| 4.2 | 编辑资料 + 头像上传 | 2h |
| 4.3 | 日记 + 待办 | 2h |
| 4.4 | 信箱（Mailbox + 6 模块 Tab） | 3h |
| 4.5 | 管理员后台 Dashboard + 用户管理 | 4h |
| 4.6 | 举报中心 + 内容管理 + 配置 | 4h |

### 第五阶段：推送 + 动画打磨 + 上架（约 2 天）

| 步骤 | 内容 | 预估 |
|------|------|------|
| 5.1 | 后端新增 FCM 推送路由 + `device_type` 字段 | 2h |
| 5.2 | App 端推送订阅 + 前台/后台通知处理 | 3h |
| 5.3 | 液态玻璃统一调优（iOS blur + Android 半透明） | 3h |
| 5.4 | 页面切换动画 + 加载骨架屏 | 2h |
| 5.5 | 启动画面 + App 图标 | 1h |
| 5.6 | App Store + Google Play 上架准备 | 3h |

---

## 4. 总工作量估算

| 阶段 | 内容 | 预估工时 |
|------|------|----------|
| 第一阶段 | 基础设施 + 树洞 | 25.5h（~3 天） |
| 第二阶段 | 食堂 + 广场 | 23h（~4 天） |
| 第三阶段 | 社团 + 二手 + 跑腿 + 一站通 | 20h（~4 天） |
| 第四阶段 | 个人空间 + 通知 + 后台 | 17h（~3 天） |
| 第五阶段 | 推送 + 打磨 + 上架 | 14h（~2 天） |
| **总计** | | **~100h（约 16 天 ≈ 3 周）** |

按每天 6 小时算：约 **17 个工作日（3.3 周）**

---

## 5. 后端需改动项

| 改动 | 文件 | 说明 |
|------|------|------|
| 推送双通道 | `routes/push.js` | 新增 FCM token 注册 + 推送逻辑，Web Push 保留不变 |
| 推送设备表 | `migrations/059_push_device_types.sql` | 新增 `device_type` ENUM('web','ios','android') 列 |
| 推送发送 | `services/pushSend.js` | 根据 `device_type` 分发到 Web Push 或 FCM |

**其他所有 16 个路由文件、7 个服务文件、6 个工具文件 —— 无需任何改动。**

---

## 6. 代码共享策略

### 6.1 Monorepo 结构

```
XMUMDorm/
├── backend/           # git submodule 或直接保留原目录
├── web/               # frontend/ → 重命名为 web/
├── mobile/            # 新建 Expo 项目
└── shared/            # 可选：抽离共享代码
    ├── api/           # API 类型定义（TypeScript）
    └── constants/     # 常量（等级、通知类型等）
```

**推荐：** 初期不抽 `shared/`，直接复制 `frontend/src/api/` → `mobile/src/api/`。两端 API 会自然分叉（如 Web 的 IndexedDB 缓存 vs App 的 AsyncStorage），强行共享反而增加复杂度。

### 6.2 共享清单

| 文件 | 共享方式 | 说明 |
|------|----------|------|
| `api/*.js`（20 个） | 直接复制 | 两者都基于 fetch，完全兼容 |
| `context/AuthContext.jsx` | 复制 + 微调 | `localStorage` → `AsyncStorage`，其余逻辑不变 |
| `context/LanguageContext.jsx` | 直接复制 | |
| `context/ToastContext.jsx` | 复制 + 微调 | RN 用 `react-native-root-toast` 替代 |
| `context/ExpFeedbackContext.jsx` | 直接复制 | |
| `utils/formatTime.js` | 直接复制 | |
| `utils/apiError.js` | 直接复制 | |
| `constants/levelThresholds.js` | 引用后端常量 | |
| `jest.config.js` | 复制 + 微调 | RN 用 `@testing-library/react-native` |

---

## 7. 关键技术验证（POC 阶段建议先做）

| 验证项 | 重要度 | 预计耗时 |
|--------|--------|----------|
| `expo-blur` 在 Android/iOS 上的液态玻璃效果 | 🔴 高 | 1h |
| `expo-image-picker` 拍照 + 上传到现有后端 | 🔴 高 | 1h |
| `expo-notifications` 接收推送 | 🟡 中 | 1h |
| TanStack Query 在 RN 中的持久化缓存 | 🟡 中 | 1h |
| `lucide-react-native` 图标完整性 | 🟢 低 | 0.5h |

---

## 8. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Android 上 `expo-blur` 性能差 | 中 | 中 | 降级为半透明背景 + 白色边框，截图对比评估 |
| 图片上传大文件 OOM | 低 | 中 | 前端先压缩（`expo-image-manipulator`）再上传 |
| 双端维护不同步 | 中 | 中 | API 层保持一致命名，新功能 Web/App 同步规划 |
| App Store 审核被拒 | 低 | 高 | 避免 WebView 壳套（我们是原生 UI），准备隐私政策页 |
| Expo 构建限制 | 低 | 低 | 免费套餐每月 30 次构建，个人开发足够 |

---

## 9. 后续迭代规划

| 版本 | 内容 | 时间 |
|------|------|------|
| **V1.0** | 树洞 + 食堂 + 广场 + 登录 | 第 1-2 周 |
| **V1.1** | 社团 + 二手 + 跑腿 + 一站通 | 第 3 周 |
| **V1.2** | 个人空间 + 通知 + 管理员后台 | 第 4 周 |
| **V1.3** | 推送 + 打磨 + 上架 | 第 5 周 |
| **V2.0** | 离线缓存 + 暗黑模式 + 手势交互 | TBD |

---

**报告编写：** Claude Code (Claude Opus 4.8)  
**最后更新：** 2026-06-01
