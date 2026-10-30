## 1. 任务位置

- Phase 2 树洞可读并能保存当前图片；本批次只交自然高度阅读。
- 本任务推进完整正文，起点为已复核列表状态；后继是媒体阅读。
- 丙负责；列表状态、公共壳与万能墙行为保持。

## 2. 开发所需

**先读**
- `app/src/features/campus/TreeholePostRow.tsx` — 标题流如何进入详情？
- `app/src/features/campus/TreeholePostDetail.tsx` — 正文在哪里折叠？
- `app/src/__tests__/p2x-treehole-post.test.tsx` — 哪些旧预期需按统一契约替换？

**已定**：统一契约“单列流接口”要求正文自然高度，长文不得裁掉。
**边界**：只允许上列三文件；复用 Text、SearchHighlight 与动作条，不改公共组件。
**运行**：app 下 `npm run test:ci -- --runInBand --testPathPattern=p2x-treehole-post --silent`；`npm run typecheck`。
**未知**：若要改公共组件才能完整阅读，记录具体接线需求；不扩大写入范围。

## 3. 工作流

1. 读第二部分，用一句话重述完整正文目标。
2. 替换旧标题流预期，新增长文与搜索断言，先运行取得失败。
3. 单独提交测试证据。
4. 列表加入自然正文，详情完整展开，保持操作独立。
5. 跑专项与类型检查，独立提交实现。

## 4. 用例

| 场景 | 输入 | 预期 | 接缝 |
| --- | --- | --- | --- |
| 纯文字 | 有标题和正文 | 两者可读，动作可点 | TreeholePostRow |
| 长文 | 多段并含尾句 | 尾句存在，无行数截断 | 行/详情 |
| 无标题 | 多行正文 | 正文只出现一次 | TreeholePostRow |
| 搜索 | 正文尾部命中 | 命中可见且可进入详情 | TreeholePostRow |
| 空正文 | 空正文有媒体 | 无空文本块，动作保留 | TreeholePostRow |
