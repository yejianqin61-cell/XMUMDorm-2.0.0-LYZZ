# Task 04: App 打包与商店上架

**优先级**: 🔵 P2 — 部署阶段
**覆盖**: App Icon (LOW) + Deep Links (LOW) + iOS 构建 + Android 构建
**预估工期**: 1-2 天
**依赖**: Task02 (UI 适配) + Task03 (原生插件)

---

## 一、任务拆解

### C04-Task001: App Icon 与品牌资源（0.25 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐ |
| **预估** | 0.25 天 |

**Step 1: 准备源图**

- 1024×1024 PNG（无透明背景）
- 使用现有 `mobile/assets/icon.png` 或 Web `public/icons/icon-512.png`

**Step 2: 自动生成所有尺寸**

在 `capacitor.config.ts` 中配置:

```ts
ios: {
  contentInset: 'always',
  scheme: 'dorm',
},
android: {
  allowMixedContent: true,
},
// Capacitor Assets 工具生成 icon + splash
```

使用 `@capacitor/assets` 工具:

```bash
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#ffffff' --iconBackgroundColorDark '#0a0a0f'
```

这会自动生成 iOS Asset Catalog (20+ 尺寸) + Android adaptive icon + Splash 全尺寸。

**验收标准**:
- [ ] iOS App 图标在所有尺寸下清晰
- [ ] Android App 图标（圆形/方形/自适应）清晰
- [ ] 与现有 PWA 图标风格一致

---

### C04-Task002: Deep Links 与 URL Scheme（0.5 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**用途**: 
- 推送通知点击 → 打开 `/post/123`
- 外部链接 `dorm://square/trending` → 打开广场热搜
- 邮件验证链接 → 打开 App

**Step 1: 配置 URL Scheme**

`capacitor.config.ts` 中已完成 `scheme: 'dorm'`（在 Task01 配置过）。

**Step 2: iOS Universal Links**

```json
// ios/App/App/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAMID.com.dorm.app",
      "paths": ["*"]
    }]
  }
}
```

**Step 3: Android App Links**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="dorm.example.com" />
</intent-filter>
```

**Step 4: 前端路由处理**

```js
// frontend/src/App.jsx — 使用 React Router 监听 Deep Link
import { Capacitor, App as CapApp } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appUrlOpen', (data) => {
    const path = data.url.replace('dorm://', '/');
    // router.navigate(path) 或 window.location = path
  });
}
```

**验收标准**:
- [ ] `dorm://treehole` 在 Safari 中能唤起 App
- [ ] 推送通知点击跳转到目标页面
- [ ] 邮件链接在 App 内打开

---

### C04-Task003: iOS 构建与 TestFlight（0.5 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**前置条件**:
- Apple Developer Program ($99/年)
- Xcode 16+
- 在 developer.apple.com 创建 App ID + 证书

**构建流程**:

```bash
# 1. 同步最新 Web 代码
npm run build --prefix frontend
npx cap sync ios

# 2. 打开 Xcode
npx cap open ios

# 3. Xcode 操作:
#    - Product → Scheme → Edit Scheme → Release
#    - Product → Archive
#    - Window → Organizer → Distribute App → App Store Connect
```

**TestFlight 分发**:
1. App Store Connect → TestFlight → Internal Testing
2. 添加测试员（Apple ID 邮箱，最多 100 人）
3. 测试员通过 TestFlight App 安装 Beta 版

**Xcode 项目注意事项**:
- `ios/App/App/Info.plist` → 不需要手动改（Capacitor 自动生成）
- `ios/App/Podfile` → `npx cap sync` 自动管理
- 首次 Archive 可能需要 `Product → Clean Build Folder`

**验收标准**:
- [ ] Xcode Archive 成功
- [ ] 上传到 App Store Connect 成功
- [ ] TestFlight 可安装 Beta 版
- [ ] Beta 版功能正常（Push/Camera/UI）

---

### C04-Task004: Android 构建与内部测试（0.5 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**前置条件**:
- Google Play Console ($25 一次性)
- Android Studio (最新稳定版)
- Java 17+ (Android Studio 自带的 JDK)

**构建流程**:

```bash
# 1. 同步
npm run build --prefix frontend
npx cap sync android

# 2. 打开 Android Studio
npx cap open android

# 3. Android Studio 操作:
#    - Build → Generate Signed Bundle / APK → Android App Bundle (.aab)
#    - 使用 keystore 签名（首次需要生成）
#    - 上传 .aab 到 Google Play Console
```

**生成 Keystore**:

```bash
keytool -genkey -v -keystore dorm-release.keystore \
  -alias dorm -keyalg RSA -keysize 2048 -validity 10000
# 将 dorm-release.keystore 放到 android/app/
```

**内部测试**:
1. Google Play Console → 内部测试 → 创建版本
2. 上传 .aab
3. 添加测试员（Google 账号，最多 100 人）
4. 测试员通过 Google Play 内部测试链接安装

**验收标准**:
- [ ] Android .aab 构建成功
- [ ] 上传到 Google Play Console 成功
- [ ] 内部测试链接可安装
- [ ] 功能正常（Push/Camera/UI）

---

### C04-Task005: CI/CD 构建自动化（可选, 0.25 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐ |
| **预估** | 0.25 天 |

**最小可行的 GitHub Actions 配置**:

```yaml
# .github/workflows/capacitor-build.yml
name: Capacitor Build
on:
  push:
    branches: [main]

jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --prefix frontend
      - run: npm run build --prefix frontend
      - uses: actions/upload-artifact@v4
        with: { name: web-dist, path: frontend/dist }
  # iOS/Android 构建需要 macOS runner + Xcode 或 Android SDK
  # 可后续按需添加
```

**验收标准**:
- [ ] GitHub Actions 自动构建 Web 产出
- [ ] 产出 `dist/` 作为 artifact 可下载

---

## 二、环境要求

| 项目 | 需要的工具 | 需要的账号 |
|------|-----------|-----------|
| iOS 构建 | Xcode 16+, macOS | Apple Developer ($99/年) |
| Android 构建 | Android Studio, JDK 17 | Google Play Console ($25 一次) |
| Push (iOS) | APNs Key | Apple Developer |
| Push (Android) | Firebase Project | Google 账号 |
| Deep Links (iOS) | Associated Domains | Apple Developer |
| Deep Links (Android) | Android App Links | Web 服务器配置 |

---

## 三、完成定义 (DoD)

- [ ] App Icon 在所有平台和尺寸下正确显示
- [ ] URL Scheme `dorm://` 正常工作
- [ ] iOS App 通过 TestFlight 可分发给测试员
- [ ] Android App 通过内部测试可分发给测试员
- [ ] Push 通知在 App 安装后正常工作
- [ ] Deep Link 点击可打开 App 内目标页面
- [ ] App 启动速度 < 2 秒（Splash Screen 消失到首页可交互）
