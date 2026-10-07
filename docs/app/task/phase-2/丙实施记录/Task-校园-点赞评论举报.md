# 校园任务 03：点赞与评论交付，举报待公共接缝

日期：2026-10-07。分支：dev-zjr。状态：部分交付；不能标为整项完成。

## 已实现

- 树洞调用 toggleLike；万能墙调用 toggleConfessionLike。显示响应 liked 状态；墙采用服务端计数，树洞响应没有计数则保留最近服务端值，不虚构新总数。
- 评论读取使用现有 getPostComments / getConfessionComments；根评论与二级回复映射到公共 CommentThread。
- 通过 DetailScreen 的 body 接缝复用 CommentComposer。评论入口在正文下方；公共详情评论计数图标仍是只读，不声称点击它打开输入框。
- 回复只允许已加载的一级评论，提交 parent_id。匿名墙递归剥离评论与回复身份；回复提示不带昵称。
- 发送有效正文，保留失败草稿；成功后显示服务端评论。发送期间编辑的新草稿不被旧响应清空。
- 万能墙沿用后端 500 字上限；树洞未发现同一接口的明确上限，没有擅自套用墙规则。
- 游客写操作不调用接口，给出 /login 入口；失效令牌沿用 SessionProvider.handleAuthFailure；403 带 muted/banned 时保留会话并提示权限拒绝。
- 同操作请求互斥，切换帖子或卸载后的旧响应不能覆盖当前帖子。评论读取失败独立重试，正文保留。
- 没有改公共 UI、导航壳、共享请求层或后端；没有 push 或 PR。

## 检查

- 红测试 753813c：新增 5 项失败，已有 23 项通过。
- 校园相关 35 项通过，包括失败恢复、草稿、匿名回复、游客、处罚、失效令牌、连续点击、超限和旧点赞响应。
- 全量 58 套通过、2 套跳过；1157 项通过、16 项跳过。
- npm run typecheck、四项 rulers、git diff --check 通过。
- 全量曾拦截禁用提示“操作失败”；修正为具体的点赞/评论提示后回归通过。
- 项目没有 lint 配置、脚本或已安装的 lint 工具；未宣称 lint 通过。
- 日志：工作区 work/xmumdorm/campus-interaction-red.log、green.log、full.log、rulers.log。green.log 是词条修正前的相关测试记录，最新全量日志已覆盖修正后的用例。

## 举报缺口

公共组件目录没有 ReportSheet；ActionSheet 的自身注释明确 O14 ReportSheet 是域专用面板，不是 ActionSheet 变体。既定 brief 要求不造公共替代布局、接缝不足暂停依赖部分。因此本轮没有用 ActionSheet 冒充举报面板，也没有启用假的举报按钮。

现有接口已经静态核对：shared/api/admin.js 的 submitReport；树洞 target_type=post，墙 target_type=confession；支持 spam/fraud/abuse/nsfw/trolling/privacy/illegal_trade/other。待甲交付原因选择、确认和状态的公共面板后，丙接入该接口并补行为测试。未向甲发送消息。

依据 easy-task-act 的 Stop and ask 条款："The seam the plan named does not exist, or sits lower than the plan claimed." 本项约定使用的举报接缝不存在，且用户已指定公共缺口交甲，因此只暂停举报部分。

## 验证边界与验收

测试用 mock 共享 API，未向云数据库写评论或提交举报。没有 iOS/Android 真机、键盘遮挡、安全区或长评论滚动验收；不能把机器测试当作设备验收。

获准测试环境中打开 /campus/7 或实际有效的树洞 id：点赞、输入评论、失败后保留草稿并重试、回复一级评论；随后打开 /campus/wall/40 或实际有效的墙 id 检查匿名回复和 500 字上限。这些写操作只在确认可写的测试数据上验收。

下一项：第三批任务 04“搜索与状态”；第 3 项的举报与设备验收仍保留待办，不跨入第四批。
