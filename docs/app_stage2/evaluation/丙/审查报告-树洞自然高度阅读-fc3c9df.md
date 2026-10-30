## 1. 本轮要求与完成程度

**本阶段需局部返工：图片迟到回调会污染当前图，实现与自动验证暂不通过复核。**

日期：2026-10-30（Asia/Shanghai），版本1.0；使用 easy-audit，两个只读子Agent并行执行规格轴与规范轴，主Agent独立复现。
未安装 code-review，按 easy-audit 独立流程；仅审查阅读批次，不重开已关闭的删除和列表状态问题。
人类授权排除的既有未跟踪技能与许可证不纳入差异审查，未清理、暂存或提交。

交付列使用“已交付、部分交付、未交付”。完成度按本行实现及自动可判定验收点成立数/5，四舍五入至5%。
共14/15点成立，平均约95%；这些百分比不包含真实接口、设备视觉、手势及非实现者人类验收。
媒体比例配置成立，只说明实现契约；异常长图的实际可读性、图片加载后的真实像素布局不能因此判为通过。

| 要求 | 来源 | 交付 | 完成度 | 五项验收及依据 |
| --- | --- | --- | --- | --- |
| R-1 自然正文阅读 | [正文任务书](../../task/丙/树洞阅读/Task-树洞-自然正文.md) | 已交付 | 100%（5/5） | 纯文字、长文尾句、无标题不重复、搜索尾部、空正文；post测试 |
| R-2 媒体阅读状态 | [媒体任务书](../../task/丙/树洞阅读/Task-树洞-媒体阅读.md) | 部分交付 | 80%（4/5） | 无图、加载成功、预览计数切图、同图重试成立；独立失败不串图不成立 |
| R-3 返回与原行为保护 | [返回任务书](../../task/丙/树洞阅读/Task-树洞-返回验证.md) | 已交付 | 100%（5/5） | 搜索阅读返回、筛选返回、刷新、换号、删除；campus测试 |

### 准确范围与提交链

- 起点：`2c08038edfe436cd7792f82f82cd15dd954679b3`，其直接后继 `5d9f35e` 是本批次任务书提交。
- 代码与测试终点：`fc3c9df8fa1cafe26e97a0c7ae119614ada0d58d`。
- 交付及本次审查终点：`96a122eb3a2db7ae8ff581d24ec1184649f0b388`，父提交就是代码终点。
- `git log 2c08038..96a122e --oneline` 共12提交，无merge；同步提交 `c3c6364` 在起点之前，不算本轮改动。
- `git diff 2c08038...96a122e --stat`：16文件、516增166删；3实现、3测试、10份丙文档。
- `git diff --quiet fc3c9df 96a122e -- app` 退出0，交付提交未改变已验证App代码。

实际实现仅 TreeholePostRow、TreeholePostDetail、TreeholeMedia；测试仅 p2x-treehole-post、p2x-treehole-media、p2x-bing-campus。
TreeholeFeed、WallFeed、CampusScreens、公共路由、UI、词条、依赖、Jest/lint配置和通用通知均未改。
审查命令运行于原工作区 `dev-gjl`，跟踪文件开工干净；本轮不合并新代码，保持审查对象固定。

### 自动验证的独立核对

| 证据 | 本次实测或核对 | 结论边界 |
| --- | --- | --- |
| 相关回归独立重跑 | 10套件186项通过，18.665秒，退出0 | 正式测试未覆盖迟到图片回调 |
| 临时RNTL迟到回调探针 | 2项均在行为断言失败，6.193秒，退出1 | 构成 D-1 图片状态污染证据 |
| 原完整验证日志 | 183套件1954项通过，16跳过，共1970项 | 对应代码终点，未无理由重跑 |
| 原类型与四项尺子 | 类型、debt/contrast/brand/tokens全通过 | 34个textSafe令牌达标，check未写生成文件 |
| 原lint日志与源码对比 | 0错误375警告；基线376 | 减少1项的原因可独立重现 |

独立回归命令在 app 执行：

```powershell
npm run test:ci -- --runInBand --testPathPattern='p2x-bing-campus|p2x-treehole|p2x-bing-wall-publish' --silent
```

原日志仍可读取：系统TEMP的 `stage2-bing-read-affected-final.log`、`stage2-bing-read-verify.log`、`stage2-bing-read-lint.log`。
三者时间均在代码提交23:30:21之后、文档提交23:35:25之前；完整日志Jest耗时221.088秒，相关回归18.480秒。
原验证脚本以 `&&` 串起类型、测试和四项尺子，日志具备整条执行链及最终tokens成功输出，接受原退出0记录。
原186、1954、16与[执行记录](../../task/丙/树洞阅读/执行记录.md)一致；跳过是live-backend-contract十项及live-api-layer六项。
本轮未改测试配置或跳过条件；增加五项的构成为正文二项、媒体二项、阅读返回一项，与提交差异一致。

lint另用当前ESLint对三个实现文件的起点源码和终点源码分别 `lintText`，filePath保持原路径，退出0：

```text
TreeholePostRow:    before 0 warnings -> after 0 warnings
TreeholePostDetail: before 1 warnings -> after 0 warnings
TreeholeMedia:      before 2 warnings -> after 2 warnings
```

消失的是详情原第61行 setExpanded(false) 的 react-hooks/set-state-in-effect；原第61行对应折叠effect。
媒体既有set-state-in-effect与refs警告仍在。配置无差异，变更中无新增eslint-disable、test.skip或范围缩小。
因此376变375来自移除折叠逻辑，不来自规则压制。

### 页面接线与文档口径

真实调用链：SquareHome.tsx:152 → CampusFeed → TreeholeFeed → TreeholePostRow。
详情路由 `app/src/app/campus/[id].tsx:6` → CampusDetailScreen.tsx:487 → TreeholePostDetail → TreeholeMedia。
post测试直接验证同一正文组件；campus测试第1507行挂载真实详情组合，覆盖搜索两页、偏移960及返回后无额外列表请求。
该组合模拟router和ListScreen滚动回调，未执行原生系统返回或FlashList测量；公共接线源码已核对存在，不能视作真机联调证明。
GC、显式刷新、筛选、身份隔离、删除及迟到业务响应均纳入186项重跑，未发现本轮相关回归。

列表正文无行数或固定高度上限，详情去除折叠；媒体与动作顺序位于正常流。
稳定画框配contain与任务书一致，不将“固定媒体比例”误判为“固定卡高裁掉正文”；尚无设备证据证明实际不遮挡。
文档准确区分阅读、保存、评论定位、公共吸顶及外部验收；未发现把未实现的保存或未验证体验写成验收完成。

## 2. 本轮缺陷：规格轴与规范轴

严重度使用“阻塞、重大、轻微、提示”。本轮仅一个规格轴缺陷；规范轴未发现可复现的硬性违例。
不将工具已强制的规则或未经复现的smell列为缺陷；无额外非阻塞改造建议。

| 编号 | 轴 | 缺陷 | 位置 | 严重度 |
| --- | --- | --- | --- | --- |
| D-1 图片状态污染 | 规格 | 旧图片回调覆盖新图成功状态 | TreeholeMedia.tsx:497–498、502 | 阻塞 |

### D-1 图片状态污染

**现象**：A切到B且B已成功加载，A迟到onError会令B显示“图片不可用”，第466行还会阻止B打开预览。
A迟到onLoad会把loadedUri写回A，第502行据此重新显示覆盖B的加载骨架。

**证据**：[真实回调](../../../../app/src/features/campus/TreeholeMedia.tsx#L497)直接写共享状态，未校验当前图片或加载尝试。
对当前组件捕获A原生事件回调，完成切B与B加载，再调用旧回调；RNTL两条正确行为断言均失败。
迟到onLoad导致骨架污染由本轮新增loadedUri逻辑引入；onError共享状态虽沿自旧实现，也必须满足本批次独立失败要求。

**影响**：成功图片被错误显示为失败或等待，用户不能按当前图片真实状态继续预览。
正式媒体测试只测“先失败再切图”，没有旧回调在新图成功后到达的交错；186项绿灯未证明此条件成立。

**判据**：媒体任务书要求“失败仅影响当前图；仍可阅读其他图”，本次复核要求“迟到回调不会污染当前图片”。
这属于本批次可观察阅读状态错误，不是视觉偏好，也不因尚无设备而免于返工。

### 可重现探针

临时文件位于系统TEMP，未修改、增加或暂存任何仓库业务及测试文件。
以下TSX完整保存于 `stage2-read-audit-20261030/stage2-read-audit-repro.test.tsx`；临时文件清理后可据此重建。

```tsx
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { TreeholeMedia } from '@/features/campus/TreeholeMedia';
import { renderApp } from '@/__tests__/helpers/renderApp';
const urls = ['https://example.test/old.jpg', 'https://example.test/current.jpg'];
for (const event of ['onError', 'onLoad'] as const) {
  it(`old ${event} must not change the successfully loaded current image`, async () => {
    const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
    const front = () => view.getByTestId('treehole-media-detail-image');
    const oldCallback = front().props[event];
    await fireEvent(view.getByTestId('treehole-media-drag-area'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await waitFor(() => expect(JSON.stringify(front().props.source)).toContain(urls[1]));
    await act(async () => front().props.onLoad({ nativeEvent: { source: { url: urls[1], width: 100, height: 100 } } }));
    expect(view.queryByTestId('treehole-media-error')).toBeNull();
    expect(view.queryByTestId('treehole-media-detail-loading', { includeHiddenElements: true })).toBeNull();
    await act(async () => oldCallback({ nativeEvent: { source: { url: urls[0], width: 100, height: 100 }, error: 'late old failure' } }));
    expect(view.queryByTestId('treehole-media-error')).toBeNull();
    expect(view.queryByTestId('treehole-media-detail-loading', { includeHiddenElements: true })).toBeNull();
    await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
    expect(view.getByTestId('treehole-media-preview-image')).toBeTruthy();
  });
}
```

临时 `jest.config.cjs` 复用 app/jest.config.js，只把测试发现目录指向临时目录，业务模块和组件未mock。
首次自动发现未找到跨盘临时测试、首次探针使用RNTL14不支持的UNSAFE查询，均为工具接缝失败，不作缺陷证据。
改用runTestsByPath和公开testID查询后，以上两项才分别在错误区、骨架断言处失败；正式配置未修改。
重建配置可使用如下JS；将appRoot替换为本工作区app绝对路径，临时目录与探针相同。

```javascript
const appRoot = 'D:/VsCodeProjects/dorm/XMUMDorm-2.0.0-LYZZ-app/app';
const base = require(appRoot + '/jest.config.js');
module.exports = { ...base, rootDir: appRoot, roots: [__dirname],
  testMatch: ['**/stage2-read-audit-repro.test.tsx'], modulePaths: [appRoot + '/node_modules'] };
```

在app运行：

```powershell
$auditTemp = Join-Path $env:TEMP 'stage2-read-audit-20261030'
node ./node_modules/jest/bin/jest.js --config "$auditTemp/jest.config.cjs" --runTestsByPath "$auditTemp/stage2-read-audit-repro.test.tsx" --runInBand --silent
```

实际输出：`Tests: 2 failed, 2 total`，退出1；onError收到treehole-media-error，onLoad收到treehole-media-detail-loading。
本轮正式回归日志为TEMP的 `stage2-read-audit-key-20261030.log`，探针日志为 `stage2-read-audit-repro-20261030.log`。
该探针证明组件对迟到事件的错误处理；没有声称已观察到指定设备上的系统回调时序或视觉效果。

## 3. 对应改进计划与剩余验收

### P-1 图片状态归属保护 ← D-1 图片状态污染（阻塞）

**要实现**：在现有媒体组件内按帖子、图片及加载尝试保护回调，只允许当前尝试修改加载和失败状态。
切图、换帖、同URL重试均使旧尝试失效；成功、失败和骨架共同指向当前图，不另建通用媒体框架。

**允许路径建议**：TreeholeMedia.tsx、p2x-treehole-media.test.tsx及丙本批次执行/交付材料。
本报告不授予实现权限；后续返工按人类授权更新任务边界。

**验收**：A迟到成功及失败不改变已成功的B；B仍可预览；换帖与同URL重试前的旧回调也被忽略。
新增用例先对当前代码失败，再以最小修复通过；保留现有18项媒体行为及阅读返回、刷新、删除和账号隔离回归。
代码变动后按团队规范补最终verify:serial和lint，结果关联最终代码提交；限定复审不重开整个模块。

**前置**：无新增甲接口、配置、词条或设备依赖；这是当前可以独立推进的下一项工作，但本次不启动。
现行Phase 2剩余的评论定位须先落实J-4/J-5参数与公共能力，图片保存须落实J-7/J-8单写者配置、依赖及新构建。
这些分项不作为修复图片状态污染的门禁；尚未满足依赖时，不宣称保存或评论定位可以直接完成。

### 外部验收清单

- 真实接口：长文多图、服务端搜索筛选分页、401/403/404、断网重试、双账号及弱网迟到响应。
- 设备：Android13/14/15及iOS，常规/长文/空/失败、无图/单图/多图/异常比例截图。
- 设备交互：原生返回保位、刷新与GC无意外回顶、切图/广场手势、减少动态、字号主题及操作可达录像。
- 人类体验：非实现者按同构建独立复验；填写机型、系统、构建、语言、主题、字号、导航、网络、预期/实测与脱敏证据。
- 甲接线：J-6广场整体吸顶独立跟踪，评论与图库分步联调；材料状态仍为待甲接收/确认。

已有材料无本阶段设备证据，约定的Stage2 evidence目录尚不存在；未重复探测已知无设备环境。
保存相册与图库权限尚未实施，不计为本次阅读缺陷，也未签为通过；后续保存阶段另收相册及权限证据。
当前结论是“需局部返工，待限定复审”；修复后通过时才可记录“实现与自动验证通过复核，待真实接口、设备及人类验收”。
