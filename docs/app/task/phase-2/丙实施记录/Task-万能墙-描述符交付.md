# 丙第一项：万能墙描述符交付

日期：2026-10-06 · 状态：待用户验收；公共接线未完成。

## 实现

- app/src/features/campus/publishFields.ts：导出 createWallPublishDescriptor(t)，id为wall；复用公共PublishFormDescriptor和Form字段；枚举上限来自共享常量。
- app/src/i18n/zh.ts、en.ts：仅新增publish.wall词条，选项按调用方当前语言生成。
- app/src/__tests__/p2x-bing-wall-publish.test.ts：独立8项行为测试，覆盖边界、切换、无效输入、白名单提交参数与请求失败。

## 验收依据

大字卡60/61、信笺卡1000/1001、便签卡300/301：前者校验允许、后者拒绝。相同301字输入切换到信笺通过，切到便签或大字卡拒绝，不截断原文。
计数遵循后端JS字符串length；客户端不复刻服务端HTML清洗，服务端仍为最终权威。
空正文与非法版式不能请求；提交只传content和template_key，不传作者字段；成功去向为现有校园Tab。

## 交甲的接线事项

由甲在features/publish/descriptors.ts注册wall描述符，并同步缺口账本；域文件不可改公共注册点。
当前FormFieldDescriptor.maxLength仅支持数字，宿主sections静态，无法随版式显示当前上限/CharCounter。丙已实现按最新values校验；请甲明确动态字段契约后接入实时计数与显示。禁止以提交校验通过宣称页面实时展示完成。
校园列表尚待丙后续页面任务实现；提交后新内容可见尚未验收。
交接单新增clubActivity归属与原Phase2四域范围不同，本任务只做wall，不扩展社团任务。

## 验证记录

首次针对性测试：描述符文件缺失，exit1；实现后8项通过。
首次类型检查发现unknown参数，已补类型收窄；后续类型检查exit0。
首次全量App回归：54套通过、1套失败，失败是新增词条前缀不在既有允许列表；已改用publish.wall前缀，没有改队友测试。
最终验证结果随收工写入下方。

## 未验证

未改公共宿主与注册点、未运行真机、未连接数据库或真实投稿。没有可演示的发布页面。App无eslint配置/脚本且未安装eslint，本次未执行lint；不把设计尺子代称lint。
用户验收：待确认描述符与边界检查结果；接线与页面另验。

最终验证：App Jest exit0，55套通过/2套跳过，1101用例通过/16跳过；本任务8项通过。typecheck exit0；四把尺子exit0；git diff --check exit0。跳过的真实服务测试未运行，不计作本任务远程验证。

基线：开工fetch并快进到fe2e961（团队新交付55个提交）；本轮源码只改丙描述符、独立测试及新增词条。
