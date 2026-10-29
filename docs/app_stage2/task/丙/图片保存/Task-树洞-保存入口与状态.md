## 1. 任务位置

- Phase 2树洞阅读与当前图保存，丙负责详情及预览共用状态。
- 前置为下载事务与图库端口契约；后继为页面接线测试和交甲。
- 现有阅读/切图/图片加载保护保留，不改公共预览宿主。

## 2. 开发所需

**先读**
- `app/src/features/campus/TreeholeMedia.tsx` — 详情与预览如何共用current？
- `app/src/features/campus/TreeholePostDetail.tsx` — 哪个props接缝把保存能力传下？
- `app/src/features/campus/CampusScreens.tsx` — 真实详情页面在哪里组合？

**已定**：失败可重试，拒绝留在原页；未注入实际保存器及词条时不启用保存。
**边界**：可改上述三文件，新增TreeholeImageSaveControls.tsx与p2x-treehole-image-save-ui.test.tsx；复用Button/InlineNotice。
**运行**：app下 `npm run test:ci -- --runInBand --testPathPattern='p2x-treehole-image-save-ui|p2x-treehole-media' --silent`；`npm run typecheck`。
**未知**：公共词条未合入；通过props消费甲提供的文本，交甲精确词条清单，不写模块硬编码产品文案。

## 3. 工作流

1. 阅读第二部分，重述当前URL及回执不串图目标。
2. 写真实媒体组件保存按钮与三结果测试，先red独立提交。
3. 实现共用控制状态和双入口，防重复及旧回执污染。
4. 串接模块props到详情页，保留关闭、切图与原操作。
5. 跑专项与类型检查后提交，实现未集成限制另列。

## 4. 用例

| 场景 | 输入 | 预期 | 接缝 |
| --- | --- | --- | --- |
| URL一致 | 第二张详情/预览保存 | 都指向第二张真实URL | TreeholeMedia |
| 成功 | 保存器resolve saved | 已保存反馈，原页不离开 | 同上 |
| 拒绝/失败 | 两类回执或异常 | 可读反馈，失败可重试 | 同上 |
| 竞态 | 保存中切图、往返、关闭/重挂 | 不显示别图回执，不重复提交 | 同上 |
| 无接入 | 未提供配置 | 无假可用入口，阅读不变 | 同上 |
