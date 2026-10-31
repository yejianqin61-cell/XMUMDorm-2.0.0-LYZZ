# 阶段A 证据清单（四角色接线 · 校园内容一条线）

**日期**：2026-10-31　**范围**：R-4 / R-5 / R-6 / R-7 / R-8（阶段A-01…A-07）
**口径**：`✅ 机器` = 自动化用例或命令退出码；`⚠️ 静态` = 只核过源码/配置；`❌ 未验证` = 需要真机或新构建。**真机证据按团队领导指示留到本批全部完成后统一验收**，本文件不写"用户已可保存"。

## 1. 自动化证据

| 用例文件 | 条数 | 断言主题 | 结果 |
|---|---|---|---|
| `app/src/__tests__/s2-17-campus-album-adapter.test.ts` | 7 | 授权不重复请求；未授权可问才请求；永久拒绝不再问；只申请仅保存权限；写入异常上抛；图库可用性；saver 可创建 | ✅ 7 passed |
| `app/src/__tests__/s2-18-campus-image-injection.test.tsx` | 4 | 图库可用才注入且五条文案来自字典；不可用不注入；重渲染不重建事务；路由参数解释不变 | ✅ 4 passed |
| `app/src/__tests__/s2-19-preview-insets.test.tsx` | 3 | Screen 内预览让出顶部/底部 inset；裸渲染不抛错；关闭钮可用 | ✅ 3 passed |
| `app/src/__tests__/s2-20-publish-wall-preview.test.tsx` | 2 | 万能墙宿主带预览且值=表单值；非万能墙不传 | ✅ 2 passed |
| `app/src/__tests__/s2-20b-form-preview-slot.test.tsx` | 2 | 表单骨架传了预览槽就渲染；不传时既有表单零变化 | ✅ 2 passed |
| `app/src/__tests__/s2-21-comment-target.test.tsx` | 7 | 目标根评论标出；折叠回复自动展开并标出；未知目标不崩；无目标折叠不变；两条路由透传；无参不改变 | ✅ 7 passed |
| 既有 `p0-03-i18n` / `p2d-01-i18n-gate` | 44 | 新词条中英同数、字数门、无内联三元 | ✅ 44 passed |
| 既有 `p2x-treehole-media` / `p2x-treehole-image-save-ui` | 42 | 预览与保存的既有行为未回归 | ✅ 42 passed |
| 既有 `p2d-02-safe-area-10` | 9 | 直接读 insets 的调用点仍只有两处 | ✅ 9 passed |
| 既有 `p1-02-data-layer` | 28 | 依赖准入闸门（新依赖已登记） | ✅ 28 passed |

**命令与结果**

| 命令 | 结果 |
|---|---|
| `cd app && npm run verify:serial` | **exit 0**（typecheck + 全量 jest + 四把尺子 34/34 `textSafe`） |
| `cd app && npx expo config --type introspect --json` | 见 §2 |

## 2. 依赖与原生配置（阶段A-01）

- `npx expo install expo-media-library` → **~57.0.5**（MIT，含 android/ ios/ 原生代码 → 变更须重建）。
- `app.json` 插件增量：`photosPermission` / `savePhotosPermission` / `isAccessMediaLocationEnabled:false` / `granularPermissions:[]`（仅保存）。
- introspect 实测：iOS 出现 `NSPhotoLibraryAddUsageDescription`；Android 出现 `WRITE_EXTERNAL_STORAGE` 与 `READ_MEDIA_VISUAL_USER_SELECTED`，**没有** `READ_MEDIA_IMAGES`（writeOnly 生效）。
- 准入登记 v1.7 已补行（漏登会让 `p1-02` 红灯）。

## 3. A2-03c / A2-04 逐项

| # | 验收项 | 机器/静态 | 真机 | 结论 |
|---|---|---|---|---|
| 1 | 图库可用时详情与预览出现保存入口 | ✅ s2-18（注入）+ 既有 UI 用例 | ❌ 未验证 | 注入链路成立；真实入口需带图库的**新构建** |
| 2 | 三结果（成功 / 拒绝 / 失败）不互相吞没 | ✅ 丙模块与 UI 既有用例 + 适配器用例 | ❌ 未验证 | 权限拒绝文案短化为「请在设置中允许相册权限」（≤12 汉字闸门） |
| 3 | 图库不可用时不注入、阅读照常 | ✅ s2-18 用例 2 | — | 降级路径有断言 |
| 4 | 全屏预览不被状态栏/手势条压住 | ✅ s2-19（测试机 inset 24/48） | ❌ 未验证 | 按 D-1 补丙 Modal；未换公共宿主 |
| 5 | 万能墙发布页实时模板预览 | ✅ s2-20 / s2-20b | ❌ 未验证 | 只 wall；其它发布类型不传 |
| 6 | 通知里的评论定位能展开并标出目标 | ✅ s2-21 | ❌ 未验证 | 路由参数 + 公共组件；**滚动到目标仍归内容域** |
| 7 | 图标/启动画面配置未被动 | ✅ `s2-16-launch-config` 仍绿 | — | 未触碰 |

## 4. 仍未验证（如实）

1. **真实相册写入**：无设备，且 `expo-media-library` 是原生依赖，必须重新构建后才能验；自动用例只到适配器层。
2. **权限弹窗与永久拒绝后的设置恢复**：需 Android 13/14/15 与 iOS 真机。
3. **预览安全区**：测试机 insets 是固定值；挖孔/灵动岛/三键导航未验。
4. **发布页预览在真机的实时性**：输入法与长文滚动下的表现未验。
5. **评论定位的滚动与加载失败提示**：属丙的模块行为（丙 02 材料第 33 行），本轮只做展开与标出。
6. **词条最终文案**：权限拒绝一句为满足 ≤12 汉字闸门做过压缩，中文口径待团队领导确认。
7. **全部改动未 push**（按规矩），云端与本机构建保持现状。

## 5. 复测指导

```powershell
cd app
npx jest src/__tests__/s2-17-campus-album-adapter src/__tests__/s2-18-campus-image-injection `
  src/__tests__/s2-19-preview-insets src/__tests__/s2-20-publish-wall-preview `
  src/__tests__/s2-20b-form-preview-slot src/__tests__/s2-21-comment-target --ci
npm run verify:serial
npx expo config --type introspect --json | Select-String "NSPhotoLibraryAddUsageDescription|READ_MEDIA"
```

真机（必须**重新构建**，旧包没有图库模块）：详情 → 预览 → 保存一次（检查相册真的多一张）；拒绝权限后重试；断网保存失败；万能墙发布页输入正文看预览；点一条评论通知看是否展开并标出目标。
