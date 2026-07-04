# Web 前端现状盘点表

## 1. 盘点目的

本文档用于回答 Web 前端正式治理前的三个核心问题：

- 现在 `frontend/` 到底有哪些页面、组件、路由和布局壳
- 哪些页面已经接入实际路由，哪些文件虽然存在但还不是正式路由页
- 后续做 Web 桌面化改版时，优先该从哪里下手

当前结论基于以下真实目录与代码：

- `frontend/src/App.jsx`
- `frontend/src/routes/layoutRoutes.jsx`
- `frontend/src/components/Layout.jsx`
- `frontend/src/components/Admin/AdminLayout.jsx`
- `frontend/src/pages/**`
- `frontend/src/components/**`

## 2. 现状摘要

### 2.1 目录规模

| 项目 | 数量 |
| --- | ---: |
| 页面 JSX 文件 | 101 |
| 页面 CSS 文件 | 38 |
| 组件 JSX 文件 | 70 |
| 组件 CSS 文件 | 28 |

### 2.2 路由与壳层现状

当前 Web 前端由 `frontend/src/App.jsx` 统一挂载，主体结构如下：

- 公共页面直接挂在顶层路由：
  - `/login`
  - `/register`
  - `/reset-password`
  - `/privacy`
  - `/terms`
- 登录后主站页面挂在 `Layout`
  - 由 `layoutRoutes.jsx` 管理
  - 当前核心仍是偏移动端的底部 Tab 结构
- 管理后台页面挂在 `AdminLayout`
  - 路径前缀为 `/myzone/admin`

### 2.3 当前布局特征

`Layout.jsx` 的现实情况是：

- 仍以移动端信息架构为主
- 根 Tab 为 4 个常驻页：
  - `/about` 对应 `SquareHome`
  - `/` 或 `treehole` 对应 `TreeHole`
  - `/eat` 对应 `CanteenHome`
  - `/myzone` 对应 `MyZone`
- 依赖底部 `TabBar`
- 使用整屏容器、全屏背景、滑动式 tab stack
- 更接近“PWA / App 壳”，还不是桌面网页壳

`AdminLayout.jsx` 的现实情况是：

- 已具备独立后台壳雏形
- 结构为侧栏 + 顶栏 + 主内容
- 但交互仍偏轻量，尚未形成完整后台设计规范

## 3. 页面接入现状

### 3.1 已接入顶层公共路由的页面

| 路径 | 页面文件 |
| --- | --- |
| `/login` | `pages/Login.jsx` |
| `/register` | `pages/Register.jsx` |
| `/reset-password` | `pages/ResetPassword.jsx` |
| `/privacy` | `pages/PrivacyPolicy.jsx` |
| `/terms` | `pages/TermsOfService.jsx` |

### 3.2 已接入主站 Layout 的页面

以下页面已由 `layoutRoutes.jsx` 或 `Layout.jsx` 直接接入：

```text
AboutAlgorithm.jsx
AboutEditorNote.jsx
AboutLevelAlgorithm.jsx
AboutProfile.jsx
AboutTeam.jsx
AboutThanks.jsx
AboutUs.jsx
AreaProductRanking.jsx
CanteenArea.jsx
CanteenBannerManage.jsx
CanteenHome.jsx
CanteenSearch.jsx
Clubs/ActivityDetail.jsx
Clubs/ClubListPage.jsx
Clubs/ClubMembersPage.jsx
Clubs/ClubPostDetail.jsx
Clubs/ClubProfile.jsx
Clubs/CreateClub.jsx
Clubs/MyClubs.jsx
Clubs/PublishActivity.jsx
Clubs/PublishClubPost.jsx
ContactUs.jsx
Diary.jsx
Disclaimer.jsx
Errands/ErrandDetail.jsx
Errands/PublishErrand.jsx
FoodCreate.jsx
FoodDetail.jsx
FoodList.jsx
FoodManage.jsx
FoodReviewPublish.jsx
FoodShopHot.jsx
Handbook/CourseReviewCreate.jsx
Handbook/CourseReviewDetail.jsx
Handbook/CourseReviewPage.jsx
Handbook/HandbookArticleDetail.jsx
Handbook/HandbookEditor.jsx
Handbook/HandbookMe.jsx
Mailbox.jsx
Marketplace/MarketplaceChat.jsx
Marketplace/MarketplaceDetail.jsx
Marketplace/MarketplaceMyWants.jsx
Marketplace/MarketplacePublish.jsx
MerchantFoodDetail.jsx
MerchantList.jsx
MerchantShopEdit.jsx
MyPosts.jsx
MyReviews.jsx
MyZone.jsx
PostDetail.jsx
PostNew.jsx
PostSearch.jsx
PostTagFeed.jsx
ProfileEdit.jsx
PublishCenter.jsx
Rankings.jsx
Schedule.jsx
SquareCampusFeed.jsx
SquareCampusPostDetail.jsx
SquareCampusPostNew.jsx
SquareClub.jsx
SquareErrands.jsx
SquareFreshmanGuide.jsx
SquareHome.jsx
SquareOrgAdmin.jsx
SquareSecondHand.jsx
SquareTrendingDetail.jsx
SquareTrendingList.jsx
SquareTrendingPostDetail.jsx
SquareTrendingPostNew.jsx
StoreCreate.jsx
TodoList.jsx
TreeHole.jsx
UserZone.jsx
```

### 3.3 已接入后台 AdminLayout 的页面

```text
Admin/AdminDashboard.jsx
Admin/AnnouncementManage.jsx
Admin/AuditLogList.jsx
Admin/ContentDetail.jsx
Admin/ContentList.jsx
Admin/ReportDetail.jsx
Admin/ReportList.jsx
Admin/SensitiveWordsManage.jsx
Admin/SystemConfig.jsx
Admin/UserDetail.jsx
Admin/UserList.jsx
```

### 3.4 存在于 pages 目录但当前未看到正式路由接入的页面或页面片段

这些文件位于 `pages/`，但按当前代码扫描，未在 `App.jsx` / `layoutRoutes.jsx` 中作为独立页面接入，后续治理时需要逐个确认定位：

```text
AboutEditor.jsx
Eat.jsx
Clubs/ClubCommentsSection.jsx
Clubs/ClubsHome.jsx
Errands/ErrandCard.jsx
Errands/ErrandsHome.jsx
Handbook/HandbookCollections.jsx
Handbook/HandbookHome.jsx
Marketplace/MarketplaceHome.jsx
Marketplace/MarketplaceItemCard.jsx
SquareTrending.jsx
```

其中部分文件命名更像“页面片段/列表卡片”，建议后续整理时迁回 `components/` 或拆入模块目录。

## 4. 页面总表

### 4.1 页面 JSX 总表

```text
AboutAlgorithm.jsx
AboutEditor.jsx
AboutEditorNote.jsx
AboutLevelAlgorithm.jsx
AboutProfile.jsx
AboutTeam.jsx
AboutThanks.jsx
AboutUs.jsx
Admin/AdminDashboard.jsx
Admin/AnnouncementManage.jsx
Admin/AuditLogList.jsx
Admin/ContentDetail.jsx
Admin/ContentList.jsx
Admin/ReportDetail.jsx
Admin/ReportList.jsx
Admin/SensitiveWordsManage.jsx
Admin/SystemConfig.jsx
Admin/UserDetail.jsx
Admin/UserList.jsx
AreaProductRanking.jsx
CanteenArea.jsx
CanteenBannerManage.jsx
CanteenHome.jsx
CanteenSearch.jsx
Clubs/ActivityDetail.jsx
Clubs/ClubCommentsSection.jsx
Clubs/ClubListPage.jsx
Clubs/ClubMembersPage.jsx
Clubs/ClubPostDetail.jsx
Clubs/ClubProfile.jsx
Clubs/ClubsHome.jsx
Clubs/CreateClub.jsx
Clubs/MyClubs.jsx
Clubs/PublishActivity.jsx
Clubs/PublishClubPost.jsx
ContactUs.jsx
Diary.jsx
Disclaimer.jsx
Eat.jsx
Errands/ErrandCard.jsx
Errands/ErrandDetail.jsx
Errands/ErrandsHome.jsx
Errands/PublishErrand.jsx
FoodCreate.jsx
FoodDetail.jsx
FoodList.jsx
FoodManage.jsx
FoodReviewPublish.jsx
FoodShopHot.jsx
Handbook/CourseReviewCreate.jsx
Handbook/CourseReviewDetail.jsx
Handbook/CourseReviewPage.jsx
Handbook/HandbookArticleDetail.jsx
Handbook/HandbookCollections.jsx
Handbook/HandbookEditor.jsx
Handbook/HandbookHome.jsx
Handbook/HandbookMe.jsx
Login.jsx
Mailbox.jsx
Marketplace/MarketplaceChat.jsx
Marketplace/MarketplaceDetail.jsx
Marketplace/MarketplaceHome.jsx
Marketplace/MarketplaceItemCard.jsx
Marketplace/MarketplaceMyWants.jsx
Marketplace/MarketplacePublish.jsx
MerchantFoodDetail.jsx
MerchantList.jsx
MerchantShopEdit.jsx
MyPosts.jsx
MyReviews.jsx
MyZone.jsx
PostDetail.jsx
PostNew.jsx
PostSearch.jsx
PostTagFeed.jsx
PrivacyPolicy.jsx
ProfileEdit.jsx
PublishCenter.jsx
Rankings.jsx
Register.jsx
ResetPassword.jsx
Schedule.jsx
SquareCampusFeed.jsx
SquareCampusPostDetail.jsx
SquareCampusPostNew.jsx
SquareClub.jsx
SquareErrands.jsx
SquareFreshmanGuide.jsx
SquareHome.jsx
SquareOrgAdmin.jsx
SquareSecondHand.jsx
SquareTrending.jsx
SquareTrendingDetail.jsx
SquareTrendingList.jsx
SquareTrendingPostDetail.jsx
SquareTrendingPostNew.jsx
StoreCreate.jsx
TermsOfService.jsx
TodoList.jsx
TreeHole.jsx
UserZone.jsx
```

### 4.2 页面 CSS 总表

```text
AboutAlgorithm.css
AboutEditorNote.css
AboutTeam.css
AboutUs.css
AreaProductRanking.css
CanteenArea.css
CanteenHome.css
CanteenSearch.css
Clubs/Clubs.css
Diary.css
Disclaimer.css
Errands/Errands.css
FoodCreate.css
FoodDetail.css
FoodList.css
FoodManage.css
FoodReviewPublish.css
Handbook/Handbook.css
Mailbox.css
Marketplace/Marketplace.css
MerchantFoodDetail.css
MerchantList.css
MerchantShopEdit.css
MyPosts.css
MyReviews.css
MyZone.css
PostDetail.css
PostNew.css
PostSearch.css
PostTagFeed.css
ProfileEdit.css
PublishCenter.css
Rankings.css
Schedule.css
SquareHome.css
StoreCreate.css
TodoList.css
TreeHole.css
```

## 5. 组件总表

### 5.1 组件 JSX 总表

```text
Admin/AdminLayout.jsx
Admin/AdminSidebar.jsx
Admin/UserActionModal.jsx
AreaCard.jsx
auth/AuthCardBrandHeader.jsx
auth/AuthPageShell.jsx
auth/Button.jsx
auth/InputField.jsx
auth/LoginCard.jsx
auth/MascotHero.jsx
AuthGuard.jsx
canteen/CanteenBannerCarousel.jsx
canteen/CanteenFoodSquare.jsx
canteen/CanteenHomeRankings.jsx
canteen/CanteenPickMeal.jsx
canteen/CanteenRegionGrid.jsx
canteen/CanteenSearchBar.jsx
Card.jsx
CategorySection.jsx
CategorySidebar.jsx
clubs/ActivityRegisterBar.jsx
EmptyState.jsx
FoodCard.jsx
FoodDetailView.jsx
FoodForm.jsx
ImagePreview.jsx
Layout.jsx
LevelProgressBar.jsx
LevelUpModal.jsx
LikeBurst.jsx
MerchantCard.jsx
MerchantHeader.jsx
PostCard.jsx
PostDetailShell.jsx
publish/PublishEntryCard.jsx
publish/PublishQuickActionSheet.jsx
ReportButton.jsx
ReviewCard.jsx
SkeletonCard.jsx
SkeletonFood.jsx
SkeletonPost.jsx
square/HotTagsStrip.jsx
square/InterestRecommendationBlock.jsx
square/MyCampusRecommendations.jsx
square/RelatedCampusTopicsBlock.jsx
square/TodayCampusHero.jsx
square/TodayCampusHotActivities.jsx
square/TodayCampusHotTopics.jsx
square/TodayCampusModuleGrid.jsx
square/TodayCampusPreviewRail.jsx
square/TodayCampusQuickActions.jsx
square/TodayCampusSummary.jsx
square/TodayCampusTrendingBoard.jsx
StackedCardCarousel.jsx
StoreForm.jsx
TabBar.jsx
TopBar.jsx
TreeHoleTagPanel.jsx
TreeHoleToolbar.jsx
ui/ActionCard.jsx
ui/AppCard.jsx
ui/EmptyState.jsx
ui/ErrorState.jsx
ui/FadeInSection.jsx
ui/InfoCard.jsx
ui/MediaCard.jsx
ui/MetricCard.jsx
ui/PageSkeleton.jsx
ui/RouteTransition.jsx
UserLevelBadge.jsx
```

### 5.2 组件 CSS 总表

```text
Admin/AdminLayout.css
AreaCard.css
canteen/CanteenBannerCarousel.css
Card.css
CategorySection.css
CategorySidebar.css
EmptyState.css
FoodCard.css
FoodDetailView.css
FoodForm.css
ImagePreview.css
Layout.css
LevelUpModal.css
LikeBurst.css
MerchantCard.css
MerchantHeader.css
PostCard.css
ReviewCard.css
Skeleton.css
SkeletonCard.css
SkeletonFood.css
SkeletonPost.css
StackedCardCarousel.css
StoreForm.css
TabBar.css
TopBar.css
TreeHoleToolbar.css
UserLevelBadge.css
```

## 6. 模块视角盘点

### 6.1 认证模块

- 页面：`Login`、`Register`、`ResetPassword`
- 组件：`auth/*`
- 现状：已相对独立，适合作为 Web 首批视觉升级模块

### 6.2 主站壳与导航

- 核心：`Layout.jsx`、`TabBar.jsx`、`TopBar.jsx`
- 现状：整体是移动端壳，不适合直接承载桌面化布局
- 治理重点：先拆“导航壳”再改页面内容

### 6.3 广场 / 社区模块

- 页面集中在 `Square*`、`Post*`、`Clubs/*`、`Errands/*`、`Marketplace/*`、`Handbook/*`
- 现状：业务最重、页面最多、耦合也最多
- 治理重点：先做页面模板收敛，再做视觉改版

### 6.4 食堂模块

- 页面集中在 `Canteen*`、`Food*`、`Merchant*`、`Rankings`
- 组件集中在 `canteen/*`、`Food*`、`Merchant*`
- 现状：模块边界比较清晰，适合单独做桌面布局规范化

### 6.5 我的页面 / 工具模块

- 页面：`MyZone`、`ProfileEdit`、`MyPosts`、`MyReviews`、`Schedule`、`TodoList`、`Diary`、`Mailbox`
- 现状：更像 App 个人中心流，桌面态下信息密度偏低
- 治理重点：改为个人工作台式布局

### 6.6 后台模块

- 页面：`pages/Admin/*`
- 壳组件：`components/Admin/*`
- 现状：已具备后台分层基础，是最适合率先规范化的部分之一

## 7. 当前主要问题

### 7.1 页面目录存在“页面 / 卡片 / 片段组件”混放

例如：

- `Errands/ErrandCard.jsx`
- `Marketplace/MarketplaceItemCard.jsx`
- `Clubs/ClubCommentsSection.jsx`

这会导致后续治理时：

- 页面数量统计失真
- 路由页和复用片段职责混乱
- 设计规范难以落地

### 7.2 Layout 仍是移动端主导

当前主壳仍强依赖：

- 底部 Tab
- 常驻四页滑动切换
- 全屏式单列内容区

这决定了 Web 正式治理前，必须优先替换页面壳层，而不是先局部修 UI。

### 7.3 样式分散，页面级 CSS 较多

当前大量页面各自维护 `.css` 文件，说明：

- 视觉 token 还没有完全统合
- 页面模板复用度还不够
- 组件层的设计系统尚未成型

### 7.4 模块命名与实际职责不完全一致

例如：

- `about/*` 实际承担“广场 / 校园 / 社区”职责
- `myzone/*` 同时承担个人中心与管理入口
- `pages/` 下部分文件其实不是 route page

后续做桌面版 IA 时，需要先统一命名与导航语义。

## 8. Web 正式治理前建议先完成的准备

1. 先冻结 `shared/*` 的接口形态，避免 Web 改版中途又拉扯 App。
2. 先梳理“真正的页面”与“页面片段组件”，把目录职责校正一轮。
3. 先定义 Web 桌面壳规范，再开始逐模块改造页面。
4. 先确定页面模板族：
   - 列表页
   - 详情页
   - 表单页
   - 个人中心页
   - 后台页
5. 先把验收口径固定：
   - `npm run build:web`
   - 关键路径人工回归
   - 共享层零回归

## 9. 结论

当前 `frontend/` 的真实状态已经足够支持 Web 独立治理，但前提是治理顺序要对：

- 先壳层
- 再模板
- 再模块页面
- 最后再统一视觉与性能

如果直接跳到“逐页改样式”，会很快被现有移动端壳和目录职责混乱拖住。
