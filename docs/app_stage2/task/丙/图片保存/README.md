# 树洞当前图片保存：模块交付批次

2026-10-30（Asia/Shanghai），丙；基线 `ee8ff22`，属于现行计划Phase 2的R-3图片保存。
阅读链路已在ee8ff22通过限定复核，本批次不重复审查或重写已关闭逻辑。

本次由协调对话转达人类授权：持续完成实现、只读独立复核、必要返工与交付，不在普通技术选择处等待确认。
按easy-task-act先写齐任务书，完成后easy-audit独立复核，easy-summary阶段交付。

- [下载与图库事务任务](Task-树洞-下载与保存事务.md)：真实URL、必要权限、写入回执与临时文件清理。
- [详情与预览任务](Task-树洞-保存入口与状态.md)：同一当前URL、三结果、失败重试及异步归属。
- [验证与交甲任务](Task-树洞-验证与接线.md)：真实组件接线、最终验证、配置材料和独立审查。

## 工程事实与方案

工作区及分支沿用丙dev-gjl；fetch成功，HEAD对main为80/0，个人远端无待合入提交，跟踪文件干净。
保留既有未跟踪技能资产，不推送、不发其他对话消息；无设备条件变化，不重新探测。
已安装Expo57、expo-file-system57.0.7、image、image-picker及sharing；未安装expo-media-library，未有相册写入能力。
分享不等于保存。已有预览是丙TreeholeMedia的Modal，公共安全区/预览宿主仍待J-7，不在本轮改造公共组件。

丙提供保存事务及可注入的图库端口，直接使用已安装File/Directory下载；写入成功才返回saved。
详情和现有预览消费同一个当前图片与保存状态；词条通过模块props接收甲统一字典结果，不私改公共i18n。
默认未注入图库和词条时不展示已可用保存入口；接入后才能使用。未集成状态单列，不把可测试模块写成已能存相册。
新增props从CampusDetailScreen经TreeholePostDetail传到TreeholeMedia，给甲一个明确模块接缝，不改公共路由。

允许App文件：`src/features/campus/{treeholeImageSave.ts,TreeholeImageSaveControls.tsx,TreeholeMedia.tsx,TreeholePostDetail.tsx,CampusScreens.tsx}`。
允许测试：`src/__tests__/{p2x-treehole-image-save.test.ts,p2x-treehole-image-save-ui.test.tsx,p2x-bing-campus.test.tsx}`。
允许文档：本目录、丙README/现行计划、校园内容交甲材料、丙evaluation报告及必要索引。
公共路由/UI/i18n、package/lock/app.json、其他业务、后端和共享API只读；不安装依赖或修改原生配置。

| 状态矩阵 | 自动验证 | 真实接口 | 设备/相册 | 人类 |
| --- | --- | --- | --- | --- |
| saved | 权限→下载→图库resolve后成功 | 未验证 | 未验证 | 未验证 |
| permission-denied | 不下载不写入，原页面继续操作 | 未验证 | 未验证 | 未验证 |
| failed | 下载/写入异常可重试，无假成功 | 未验证 | 未验证 | 未验证 |
| 切图/换帖/关闭 | 捕获真实URL，旧回执不串图 | 未验证 | 未验证 | 未验证 |
| 无原生接线 | 保存入口不启用 | 不适用 | 未验证 | 未验证 |

前置分步：J-8安装/权限/重建和J-9正式词条由甲接线；J-7公共宿主只影响公共布局联调，不阻塞模块保存逻辑。
SDK依据：[FileSystem57](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/)、[MediaLibrary57](https://docs.expo.dev/versions/v57.0.0/sdk/media-library/)。
SDK57旧函数须走`expo-media-library/legacy`，主入口同名旧函数可能运行时抛错；接线材料给出确切方案，不凭记忆猜API。
