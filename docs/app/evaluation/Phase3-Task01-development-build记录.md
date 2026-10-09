# Phase 3 Task 01 · development build 记录

日期：2026-10-09  
目标：为 Phase 3 设备验收建立可复现的 SDK 57 development build 基线。  
结论：**未产出构建；外部前置缺失，记录保持未验。**

## 1. 计划入口与仓库事实

| 项 | 事实 | 证据 |
|---|---|---|
| SDK | Expo SDK 57 | `app/package.json` 的 `expo: ~57.0.26` |
| development profile | 已配置 `developmentClient: true` | `app/eas.json` |
| EAS project id | 缺失 | `app/app.json` 无 `extra.eas.projectId` |
| Dev Client | 未安装 | `app/package.json` 无 `expo-dev-client` |
| 本地 Android 工具 | 不可用 | `adb` 不在 PATH，`ANDROID_HOME` 未配置 |
| 本地 iOS 工具 | 不可用 | `xcrun` 不在 PATH |
| EAS CLI | 不可用 | `eas` 不在 PATH，未发现项目级 CLI |

## 2. 判定

当前不能执行以下任一路径：

- EAS：需要所有者登录的 Expo 项目、`extra.eas.projectId` 和 Dev Client 依赖。
- 本地 Android：需要 Android SDK、`ANDROID_HOME`、`adb` 和生成后的本地原生工具链。
- 本地 iOS：需要 macOS、Xcode 和签名环境。

因此本记录不填写构建号，不把 Expo Go 或静态 typecheck 当作 development build。

## 3. 后续解除条件

- 所有者提供或初始化 Expo 项目，并完成 EAS 登录。
- 按 SDK 57 兼容版本安装 `expo-dev-client`。
- 运行 development profile 构建并保存构建 URL、commit、平台和构建号。
- 只在构建可安装后开始 Task 02 的设备矩阵记录。

## 4. 验证边界

本 task 没有业务代码变更。设备矩阵、触控、横屏、大屏、最大字号和 reduced-motion 仍为 `⏳ 未跑`，见 [安全区机型矩阵记录.md](../test/安全区机型矩阵记录.md)。
