# Web 前端组件迁移清单（React Native App）

**编写日期：** 2026-06-01  
**目的：** 系统梳理 Web 前端全部 UI 组件、业务组件和页面，按迁移优先级分类，指导 RN App 的逐模块复刻。

---

## 一、总览

| 类别 | 数量 | 说明 |
|------|------|------|
| 共享 UI 组件 | 14 个（+14 个 CSS） | 优先迁移，跨模块复用 |
| 业务组件 | 45 个（含子目录） | 按模块分批迁移 |
| 页面 | 86 个（+38 个 CSS） | 按模块映射为 Screens |
| Context/Hooks | 4 个 | 已迁移 2 个（Auth + Language） |
| API 层 | 20 个 | 已全部搬运 |

---

## 二、共享 UI 组件（第一批迁移——最高优先级）

这些组件不依赖具体业务逻辑，可被所有模块复用。**已完成 5 个。**

| # | Web 组件 | 行数 | CSS行数 | RN 状态 | 迁移难度 | 说明 |
|---|---------|------|---------|---------|----------|------|
| 1 | `GlassView`（无独立文件，CSS 模式） | — | — | ✅ 已迁移 | ⭐ | `mobile/src/components/ui/GlassView.tsx`，`expo-blur` + 半透明降级 |
| 2 | `Card.jsx` | 15 | 22 | ✅ 已迁移 | ⭐ | `mobile/src/components/ui/Card.tsx` |
| 3 | `EmptyState.jsx` | 41 | 47 | ✅ 已迁移 | ⭐ | `mobile/src/components/ui/EmptyState.tsx` |
| 4 | `StyledButton`（无独立文件，CSS 模式） | — | — | ✅ 已迁移 | ⭐ | `mobile/src/components/ui/StyledButton.tsx` |
| 5 | `StyledInput`（无独立文件，CSS 模式） | — | — | ✅ 已迁移 | ⭐ | `mobile/src/components/ui/StyledInput.tsx` |
| 6 | `ImagePreview.jsx` | 84 | 93 | ❌ 待迁移 | ⭐⭐ | 全屏图片预览（Lightbox），RN 用 Modal + FlatList 实现 |
| 7 | `SkeletonCard.jsx` | 20 | 35 | ❌ 待迁移 | ⭐ | 骨架屏，RN 用 `Animated.View` + 渐变动画 |
| 8 | `SkeletonPost.jsx` | 31 | 129 | ❌ 待迁移 | ⭐ | 帖子骨架屏 |
| 9 | `SkeletonFood.jsx` | 20 | 35 | ❌ 待迁移 | ⭐ | 食堂骨架屏 |
| 10 | `LikeBurst.jsx` | 67 | 32 | ❌ 待迁移 | ⭐⭐ | 点赞粒子爆发动画，RN 用 `react-native-reanimated` |
| 11 | `StackedCardCarousel.jsx` | 115 | 85 | ❌ 待迁移 | ⭐⭐⭐ | 图片堆叠轮播，RN 用 FlatList + snapToInterval |
| 12 | `UserLevelBadge.jsx` | 21 | 27 | ❌ 待迁移 | ⭐ | 等级徽章小标签 |
| 13 | `LevelProgressBar.jsx` | 22 | — | ❌ 待迁移 | ⭐ | 等级进度条 |
| 14 | `LevelUpModal.jsx` | 50 | 55 | ❌ 待迁移 | ⭐⭐ | 升级弹窗（全局 Modal） |

---

## 三、业务组件（第二批迁移——按模块）

### 3.1 树洞 / 帖子

| # | Web 组件 | 行数 | CSS行数 | RN 状态 | 迁移难度 |
|---|---------|------|---------|---------|----------|
| 1 | `PostCard.jsx` | 224 | 254 | ✅ 已完成 | ⭐⭐⭐ |
| 2 | `PostCardWaterfall` | — | — | ✅ 已完成 | ⭐⭐⭐ |
| 3 | `PostDetailShell.jsx` | 391 | — | ❌ 待迁移 | ⭐⭐⭐⭐ |
| 4 | `TreeHoleToolbar.jsx` | 325 | 144 | ✅ 部分（内联在 Screen） | ⭐⭐⭐ |
| 5 | `TreeHoleTagPanel.jsx` | 237 | — | ❌ 待迁移 | ⭐⭐ |
| 6 | `TreeholeSkeletonCard` | — | — | ✅ 已完成 | ⭐ |
| 7 | `ReportButton.jsx` | 134 | — | ❌ 待迁移 | ⭐⭐ |

### 3.2 食堂

| # | Web 组件 | 行数 | CSS行数 | RN 状态 | 迁移难度 |
|---|---------|------|---------|---------|----------|
| 8 | `FoodCard.jsx` | 107 | 136 | ❌ 待迁移 | ⭐⭐ |
| 9 | `FoodDetailView.jsx` | 80 | 126 | ❌ 待迁移 | ⭐⭐⭐ |
| 10 | `FoodForm.jsx` | 162 | 152 | ❌ 待迁移 | ⭐⭐⭐ |
| 11 | `MerchantCard.jsx` | 68 | 105 | ❌ 待迁移 | ⭐⭐ |
| 12 | `MerchantHeader.jsx` | 150 | 166 | ❌ 待迁移 | ⭐⭐⭐ |
| 13 | `ReviewCard.jsx` | 39 | 71 | ❌ 待迁移 | ⭐⭐ |
| 14 | `AreaCard.jsx` | 35 | 25 | ❌ 待迁移 | ⭐ |
| 15 | `StoreForm.jsx` | 148 | 138 | ❌ 待迁移 | ⭐⭐⭐ |
| 16 | `CategorySection.jsx` | 37 | 28 | ❌ 待迁移 | ⭐⭐ |
| 17 | `CategorySidebar.jsx` | 83 | 78 | ❌ 待迁移 | ⭐⭐ |
| 18 | `CanteenBannerCarousel.jsx` | 182 | 218 | ❌ 待迁移 | ⭐⭐⭐ |
| 19 | `CanteenFoodSquare.jsx` | 134 | — | ❌ 待迁移 | ⭐⭐⭐ |
| 20 | `CanteenHomeRankings.jsx` | 109 | — | ❌ 待迁移 | ⭐⭐ |
| 21 | `CanteenPickMeal.jsx` | 88 | — | ❌ 待迁移 | ⭐⭐ |
| 22 | `CanteenRegionGrid.jsx` | 68 | — | ❌ 待迁移 | ⭐⭐ |
| 23 | `CanteenSearchBar.jsx` | 38 | — | ❌ 待迁移 | ⭐ |

### 3.3 认证

| # | Web 组件 | 行数 | RN 状态 | 迁移难度 |
|---|---------|------|---------|----------|
| 24 | `AuthPageShell.jsx` | 21 | ❌（LoginScreen 已内联复刻） | ⭐ |
| 25 | `AuthCardBrandHeader.jsx` | 14 | ❌ | ⭐ |
| 26 | `LoginCard.jsx` | 13 | ❌（LoginScreen 已内联复刻） | ⭐ |
| 27 | `MascotHero.jsx` | 110 | ❌ | ⭐⭐ |
| 28 | `Button.jsx` | 42 | ✅ 已由 StyledButton 替代 | ⭐ |
| 29 | `InputField.jsx` | 45 | ✅ 已由 StyledInput 替代 | ⭐ |

### 3.4 管理员后台

| # | Web 组件 | 行数 | CSS行数 | RN 状态 | 迁移难度 |
|---|---------|------|---------|---------|----------|
| 30 | `AdminLayout.jsx` | 62 | 161 | ❌ 待迁移 | ⭐⭐ |
| 31 | `AdminSidebar.jsx` | 68 | — | ❌ 待迁移 | ⭐⭐ |
| 32 | `UserActionModal.jsx` | 108 | — | ❌ 待迁移 | ⭐⭐ |

### 3.5 布局 / 导航

| # | Web 组件 | 行数 | CSS行数 | RN 状态 | 迁移难度 |
|---|---------|------|---------|---------|----------|
| 33 | `Layout.jsx` | 372 | 242 | ❌（RN 用自建 TabBar） | ⭐⭐⭐ |
| 34 | `TopBar.jsx` | 76 | 155 | ❌（RN 各 Screen 自行处理头部） | ⭐⭐ |
| 35 | `TabBar.jsx` | 152 | 104 | ✅（App.tsx 内联） | ⭐ |
| 36 | `AuthGuard.jsx` | 17 | — | ✅（App.tsx 内联 isLoggedIn 判断） | ⭐ |

---

## 四、页面（第三批迁移——按模块映射为 Screens）

### 4.1 树洞专区（6 页）

| Web Page | 行数 | RN Screen | 状态 |
|----------|------|-----------|------|
| `TreeHole.jsx` | 796 | `TreeholeScreen.tsx` | ✅ 已迁移 |
| `PostDetail.jsx` | 690 | `PostDetailModal.tsx` | ✅ 已迁移 |
| `PostNew.jsx` | 260 | `NewPostModal.tsx` | ✅ 已迁移 |
| `PostSearch.jsx` | 139 | — | ❌ |
| `PostTagFeed.jsx` | 144 | —（Tag 筛选内联在 Treehole） | ⚠️ 部分 |
| `MyPosts.jsx` | 109 | — | ❌ |

### 4.2 食堂专区（17 页）

| Web Page | 行数 | RN Screen | 状态 |
|----------|------|-----------|------|
| `CanteenHome.jsx` | 35 | — | ❌ |
| `CanteenArea.jsx` | 426 | `EatScreen.tsx` | ⚠️ 简版 |
| `CanteenSearch.jsx` | 148 | — | ❌ |
| `CanteenBannerManage.jsx` | 387 | — | ❌ |
| `FoodDetail.jsx` | 430 | — | ❌ |
| `FoodCreate.jsx` | 93 | — | ❌ |
| `FoodList.jsx` | 406 | — | ❌ |
| `FoodManage.jsx` | 194 | — | ❌ |
| `FoodReviewPublish.jsx` | 242 | — | ❌ |
| `FoodShopHot.jsx` | 189 | — | ❌ |
| `MerchantList.jsx` | 318 | — | ❌ |
| `MerchantFoodDetail.jsx` | 216 | — | ❌ |
| `MerchantShopEdit.jsx` | 142 | — | ❌ |
| `StoreCreate.jsx` | 40 | — | ❌ |
| `AreaProductRanking.jsx` | 185 | — | ❌ |
| `Rankings.jsx` | 282 | — | ❌ |
| `Eat.jsx` | 10 | —（已废弃占位） | ❌ |

### 4.3 广场专区（12 页）

| Web Page | 行数 | RN Screen | 状态 |
|----------|------|-----------|------|
| `SquareHome.jsx` | 184 | `SquareScreen.tsx` | ⚠️ 占位 |
| `SquareTrendingList.jsx` | 87 | — | ❌ |
| `SquareTrendingDetail.jsx` | 136 | — | ❌ |
| `SquareTrendingPostNew.jsx` | 127 | — | ❌ |
| `SquareTrendingPostDetail.jsx` | 140 | — | ❌ |
| `SquareCampusPostNew.jsx` | 207 | — | ❌ |
| `SquareCampusPostDetail.jsx` | 159 | — | ❌ |
| `SquareOrgAdmin.jsx` | 501 | — | ❌ |
| `SquareClub.jsx` | 7 | —（跳转入口） | ❌ |
| `SquareSecondHand.jsx` | 7 | —（跳转入口） | ❌ |
| `SquareErrands.jsx` | 7 | —（跳转入口） | ❌ |
| `SquareFreshmanGuide.jsx` | 7 | —（跳转入口） | ❌ |

### 4.4 社团专区（11 页）

| Web Page | 行数 | RN Screen | 状态 |
|----------|------|-----------|------|
| `ClubsHome.jsx` | 165 | — | ❌ |
| `ClubProfile.jsx` | 505 | — | ❌ |
| `CreateClub.jsx` | 143 | — | ❌ |
| `ClubListPage.jsx` | 103 | — | ❌ |
| `ClubMembersPage.jsx` | 75 | — | ❌ |
| `ActivityDetail.jsx` | 220 | — | ❌ |
| `ClubPostDetail.jsx` | 192 | — | ❌ |
| `PublishActivity.jsx` | 245 | — | ❌ |
| `PublishClubPost.jsx` | 216 | — | ❌ |
| `MyClubs.jsx` | 53 | — | ❌ |
| `ClubCommentsSection.jsx` | 463 | — | ❌ |

### 4.5 其余专区

| 模块 | 页数 | 关键页面 |
|------|------|----------|
| 二手市场 | 6 页 | MarketplaceHome/Detail/Publish/Chat/MyWants/ItemCard |
| 跑腿 | 4 页 | ErrandsHome/Detail/PublishErrand/ErrandCard |
| 一站通 | 8 页 | HandbookHome/ArticleDetail/Editor/Collections/Me/CourseReview* |
| 课表 | 1 页 | Schedule.jsx（655 行，最复杂单页） |
| 日记 | 1 页 | Diary.jsx（531 行） |
| 待办 | 1 页 | TodoList.jsx（303 行） |
| 认证 | 3 页 | Login/Register/ResetPassword |
| 我的 | 4 页 | MyZone/UserZone/ProfileEdit/MyReviews |
| 信箱 | 1 页 | Mailbox.jsx（340 行） |
| 关于 | 7 页 | AboutUs/Team/Thanks/Algorithm 等 |
| 管理员 | 11 页 | Dashboard/UserList/UserDetail/Report*/Content*/Announcement*/SystemConfig/SensitiveWords/AuditLog |

---

## 五、迁移路线图

### 🥇 第一批：共享 UI 基础层（已迁移 5/14）

```
优先级：骨架屏 > 图片预览 > 等级组件 > 点赞动画 > 轮播
工时：约 1 天
```

### 🥈 第二批：树洞完整体验（进行中）

| 组件/页面 | 状态 |
|-----------|------|
| PostCardWaterfall | ✅ |
| TreeholeScreen | ✅ |
| PostDetailModal | ✅ |
| NewPostModal | ✅ |
| TreeHoleToolbar（独立组件化） | ⚠️ 内联 |
| TreeHoleTagPanel（Tag 管理面板） | ❌ |
| PostSearch | ❌ |
| ReportButton | ❌ |

### 🥉 第三批：食堂核心体验

FoodCard → FoodDetailView → MerchantCard → AreaCard → CanteenHome → 点评系统

### 第四批：广场 + 社团 + 二手

### 第五批：个人空间 + 通知 + 管理员后台

### 第六批：课表 + 日记 + 待办（低频模块）

---

## 六、统计

| 指标 | 数值 |
|------|------|
| 共享 UI 组件 | 14 个（已迁移 5） |
| 业务组件 | 45 个（已迁移 3） |
| 页面 | 86 个（已迁移 7） |
| 已迁移总计 | **15/145 = 10.3%** |
| 预计完整迁移 | **约 8-10 周** |

---

**报告编写：** Claude Code (Claude Opus 4.8)  
**最后更新：** 2026-06-01
