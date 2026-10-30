## 1. 任务位置

- Phase 2树洞阅读与当前图保存，丙负责R-3模块事务；起点是已复核阅读链路。
- 本任务落实三结果，后继是详情/预览按钮消费；原生安装不属于本任务写入范围。
- 不改后端，不用系统分享冒充图库写入。

## 2. 开发所需

**先读**
- `app/src/features/campus/TreeholeMedia.tsx` — 真实current URL怎样得到？
- `app/src/features/clubs/exportRegistrations.ts` — 已安装文件系统怎样消费？
- `docs/app_stage2/task/丙/校园内容交甲接线材料/04-图片预览与保存.md` — J-8缺哪些能力？

**已定**：saved仅在图库写入成功后返回；拒绝和失败分开，临时下载不算成功。
**边界**：新增treeholeImageSave.ts与p2x-treehole-image-save.test.ts；仅用既有文件系统和显式图库端口。
**运行**：app下 `npm run test:ci -- --runInBand --testPathPattern=p2x-treehole-image-save.test --silent`；`npm run typecheck`。
**未知**：原生图库未安装；端口注入后才允许产品启用，临时文件异常与清理独立处理。

## 3. 工作流

1. 阅读第二部分，重述三结果与真实写入边界。
2. 写权限、下载、写入及重复请求失败用例，先red并独立提交。
3. 实现当前URL下载、权限检查、图库写入及清理，最小green。
4. 验证不假成功和同URL防重复，类型检查后提交。
5. 将原生未接入事实留给交甲材料，不改公共配置。

## 4. 用例

| 场景 | 输入 | 预期 | 接缝 |
| --- | --- | --- | --- |
| 成功 | 有权、下载和写入成功 | 等写入resolve才saved | createTreeholeImageSaver |
| 拒绝 | 无权且拒绝/不可再问 | permission-denied，无下载 | 同上 |
| 失败 | 下载或写入reject | failed，清理且允许重试 | 同上 |
| 重复 | 同URL两次未完成调用 | 一次实际写入 | 同上 |
| 文件 | 无效URL、非图、空文件、清理异常 | 不假成功或误报已写入失败 | 同上 |
