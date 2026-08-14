# Phase3：底部 Tab、轮播广告与树洞话术治理规格

## Problem Statement

Phase3 面向 Capacitor App 的上线前体验和商业化基础能力，包含三个相互独立但都位于高频入口的治理目标：

1. 当前底部 Tab 栏高度偏高、选中态偏重，玻璃卡片和渐变感较强，缺少 Apple 风格的轻量、连续和跟手体验。
2. 现有轮播图已经支持广告类型和多种跳转，但广告内容仍与普通帖子边界不清，无法满足管理员代发、广告帖隔离、投放方展示和未来商业投放的要求。
3. 树洞页面仍存在“继续沿着你的兴趣看”“和你的校园身份更相关”等未实现算法推荐的话术，容易向用户暗示不存在的个性化排序能力。

本规格覆盖 Capacitor App 和 Web 管理端的共享后端能力；废弃的 `mobile/` RN 前端不在范围内。

## Solution

### 1. Apple 风格底部 Tab 栏

将底部 Tab 栏调整为四栏稳定主导航：广场、树洞、食堂、我的。整条栏使用单层轻量半透明玻璃材质，共享选中蒙版在四栏之间平移；不为每个 Tab 叠加独立卡片。

视觉栏高度从当前约 72px 收束到约 56–60px，`safe-bottom` 独立叠加，不压缩系统手势区。选中态同时使用图标/文字层级和共享蒙版表达，动画约 160–220ms、可被下一次点击打断，并支持 `prefers-reduced-motion` 降级。

### 2. 管理员广告轮播系统

复用现有帖子正文、图片上传、编辑器和详情容器，将广告帖作为独立元数据管理的帖子内容：

- 普通 `posts` 继续承载正文主体。
- 新增广告元数据模型，保存广告状态、投放方、CTA 和审计关联。
- 广告轮播图保留现有图片、标题、副标题、排序、上下线、定时和投放位置能力。
- 一条广告帖可以被广场、食堂等多张轮播图复用；每张轮播图可以独立配置展示创意。
- 只有管理员可以创建、编辑、预览、投放、下线、归档广告帖和广告轮播图。
- 广告帖不进入树洞、食堂、广场普通信息流、搜索、热搜、推荐、个人帖子列表或其他普通发现入口。
- 普通用户只有在有效广告轮播图关联存在时才能访问广告详情；关联失效后显示“广告已结束或暂不可用”。
- 管理员可以在后台预览草稿、下线和过期广告，不绕过权限边界。
- 广告详情复用现有帖子详情容器，但隐藏点赞、评论、分享、作者主页等普通互动，显示“广告 · 投放方名称”。
- 每条广告帖支持一个可选 CTA。站内目标使用 App 内路由；`https` 外链使用 Capacitor Browser；微信、WhatsApp、电话等特殊协议暂不支持。
- 第一版记录最小广告点击事件，不实现复杂曝光归因、计费和竞价。

管理员入口位于现有轮播管理工作区，分为“广告内容库”和“轮播投放位”两个区域，不新增顶层导航。

### 3. 树洞推荐话术清理

删除所有暗示个性化推荐、兴趣建模或校园身份排序的未实现文案。只调整可见文案，不改变树洞排序、分页、筛选、接口和数据行为；中英文模式同步清理。

## User Stories

1. As an App user, I want the four primary sections to remain visible in one compact bottom navigation, so that I can switch sections without horizontal scrolling or a More menu.
2. As an App user, I want the selected tab to be obvious through more than color alone, so that I can identify my current section at a glance.
3. As an App user, I want the selected glass indicator to slide briefly between tabs, so that navigation feels continuous rather than like a page reload.
4. As an App user with reduced-motion preferences, I want tab selection to switch without sliding animation, so that the navigation remains comfortable and accessible.
5. As an App user, I want the bottom navigation to respect Android safe areas and gesture navigation, so that labels and touch targets are not obstructed.
6. As an App user, I want tab labels to remain readable in both Chinese and English modes, so that language switching does not create mixed or clipped labels.
7. As an administrator, I want to create an advertisement post from the existing carousel management workspace, so that advertising content has one discoverable operational entry.
8. As an administrator, I want to reuse the existing post editor for advertising content, so that I can create rich text and image-based promotion without learning a second editor.
9. As an administrator, I want to identify the sponsor name and optionally upload a sponsor logo, so that users can distinguish paid promotion from ordinary campus content.
10. As an administrator, I want to save an advertisement as a draft before assigning a placement, so that unfinished content is never exposed to users.
11. As an administrator, I want to preview draft, inactive and expired advertisements, so that I can verify content before publishing it.
12. As an administrator, I want to assign one advertisement post to multiple carousel banners, so that the same campaign can run in multiple locations.
13. As an administrator, I want to customize the image, title, subtitle, order and schedule per placement, so that the same campaign can use location-specific creative.
14. As an administrator, I want the system to reject an advertisement banner that points to a normal post, so that advertising content cannot bypass the advertisement boundary.
15. As an administrator, I want an advertisement banner to support either no jump or a jump to an advertisement post, so that simple awareness campaigns do not require a landing page.
16. As an administrator, I want to configure one optional CTA for an advertisement post, so that users have a clear next action after reading the promotion.
17. As an App user, I want internal advertisement CTAs to open inside the App, so that I do not lose the current session or leave the WebView.
18. As an App user, I want HTTPS advertisement links to open through a safe Capacitor browser surface, so that returning to the App remains predictable.
19. As an App user, I want expired or withdrawn advertisements to show a clear unavailable state, so that an old link does not silently redirect me to unrelated content.
20. As an App user, I want advertisement details to show the sponsor and advertisement label, so that commercial content is transparent.
21. As an App user, I do not want advertisement posts mixed with normal likes, comments, shares or author pages, so that advertising does not masquerade as community discussion.
22. As an administrator, I want archived advertisements to retain their content and audit history, so that accidental deletion can be recovered and campaigns can be reused.
23. As an administrator, I want to see basic advertisement click counts, so that I can provide a minimal delivery result to a sponsor.
24. As a normal user, I do not want advertisement posts to appear in the treehole, canteen, square feeds, search, trending, recommendations or personal post lists, so that the only public entry is an active advertisement carousel.
25. As a treehole user, I want neutral loading, empty and end-of-feed language, so that the product does not claim to personalize content before recommendation exists.
26. As an English-mode user, I want the recommendation-copy cleanup to apply to English strings too, so that the unsupported promise is not merely translated.

## Implementation Decisions

- Use the existing shared TabBar seam for App navigation; keep the four current routes and active-index logic unchanged.
- Use one shared glass surface and one shared selection indicator; do not create four nested tab cards.
- Reuse existing safe-area variables and page bottom padding. Visual tab height and safe-area inset remain separate values.
- Keep the current carousel tables and existing placement fields. Add only the advertisement relation/metadata needed to distinguish an advertisement post from a normal post.
- Use a dedicated advertisement metadata model linked to the existing post body by `post_id`; do not add advertising fields to every normal post.
- The metadata model must support at least: post relation, draft/active/archived lifecycle, sponsor name, optional sponsor logo, one CTA configuration, creator/updater audit fields, and timestamps.
- Keep the existing `link_type='post'` concept for ordinary content, but use an explicit advertisement-post target type for advertisement placements. The server must reject mismatched targets.
- Treat an advertisement as publicly accessible only when its metadata is active and at least one associated carousel placement is active and within its schedule.
- The public advertisement route must enforce this relation server-side. Frontend hiding is not an authorization boundary.
- When no valid placement remains, return a stable unavailable state instead of redirecting to a normal feed.
- Admin preview is a protected path and may render draft, inactive or expired advertisements without making them publicly discoverable.
- Advertisement content creation and placement configuration are separate steps inside the existing carousel management workspace.
- Each placement owns its own creative and schedule; the advertisement post owns the shared landing content and CTA.
- Advertisement details reuse the existing post detail container in an advertisement mode that hides community interactions and displays sponsor disclosure.
- Internal CTA targets use existing App/Web routes. HTTPS external targets use the official Capacitor Browser plugin on App and a normal safe external-link path on Web.
- Reject unsupported URL schemes and accept only internal routes or `https` external URLs in the first release.
- Record click events at the highest shared server seam after validating the active placement; do not add exposure or billing calculations in this phase.
- Advertisement posts use logical archive/delete semantics and retain audit history.
- Filter advertisement posts at the server query seam for every normal discovery endpoint, including feeds, search, trending, recommendations and personal post lists.
- Remove unsupported recommendation wording at the shared copy/component seam; do not alter sorting or query behavior.
- Keep all user-facing system labels localized; sponsor-authored content remains original content and is not machine-translated by the UI.

## Testing Decisions

- Tests assert externally visible behavior: route access, returned feed membership, banner validation, lifecycle visibility, CTA navigation, click recording and rendered tab states. They should not assert private component implementation details.
- Add route-level tests for advertisement creation, admin-only mutation, draft preview, public access with/without a valid placement, expired placement rejection, logical archive, and invalid target rejection.
- Add query/filter tests proving advertisement posts are absent from every normal discovery endpoint while remaining available through a valid advertisement placement.
- Add carousel-management tests for one-to-many reuse, per-placement creative fields, scheduling and ad/non-ad target constraints.
- Add frontend tests for advertisement mode: sponsor label, hidden community actions, unavailable state, internal navigation, HTTPS browser invocation boundary, and admin preview.
- Add TabBar interaction tests for active index, shared indicator position, reduced-motion behavior, keyboard/focus semantics where applicable, and safe-area-compatible layout classes.
- Add copy regression tests or repository-wide assertions ensuring the removed recommendation phrases do not appear in Chinese or English treehole UI strings.
- Use existing Jest route tests, React Testing Library component tests and the project’s production build commands as prior art.
- Manual acceptance must cover Android Capacitor APK and Web in Chinese and English modes, including Android back navigation, small screens, gesture navigation, long advertisement content and invalid/expired campaigns.

## Out of Scope

- Automatic ad billing, bidding, invoicing, subscriptions or payment integration.
- Impression attribution, conversion attribution, demographic targeting and recommendation algorithms.
- WhatsApp, WeChat, phone, SMS, custom URL schemes and deep-link handoff in the first release.
- A separate advertising CMS or a separate standalone advertisement page editor.
- User-submitted advertisements or merchant self-service advertising in the first release.
- Advertising posts in ordinary community interactions, comments, likes, shares or author pages.
- Changes to the discarded `mobile/` RN frontend.
- The Phase3 item 16 unspecified backlog item.

## Further Notes

- The current carousel implementation already supports ad labeling, scheduling, placement-specific creative fields and multiple target types; this specification narrows and hardens the advertisement path instead of replacing it.
- The first implementation should land in small vertical slices: advertisement data/filters, admin content workflow, public advertisement route, placement/CTA behavior, click events, then TabBar and copy cleanup.
- The strict-entry rule is an application access rule, not a claim that a copied URL can never be observed. The server must refuse access when no currently valid placement exists.
- The existing Phase3 Apple-style Tab research remains the visual reference for the TabBar portion of this specification.
