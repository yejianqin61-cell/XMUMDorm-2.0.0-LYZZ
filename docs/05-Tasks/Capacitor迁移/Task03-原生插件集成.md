# Task 03: 原生插件集成

**优先级**: 🟡 P1 — Push + Camera 是 App 核心体验
**覆盖**: Push Notifications (MED) + Camera/Photo (MED) + StatusBar (LOW) + Splash (LOW)
**预估工期**: 2-3 天
**依赖**: Task01 (Capacitor 基础安装)

---

## 一、插件选型

| 功能 | 插件包 | 版本 | 用途 |
|------|--------|------|------|
| 推送通知 | `@capacitor/push-notifications` | 7.x | 替代 sw.js Web Push |
| 相机/相册 | `@capacitor/camera` | 7.x | 替代 input[type=file] |
| 状态栏 | `@capacitor/status-bar` | 7.x | iOS 状态栏文字颜色 |
| 启动画面 | `@capacitor/splash-screen` | 7.x | App 启动品牌展示 |
| 触觉反馈 | `@capacitor/haptics` | 7.x | 点赞/按钮震动 |
| 深度链接 | `@capacitor/app` (内置) | — | URL Scheme + Universal Links |

**不需要的插件** (Capacitor Core 已内置):
- `@capacitor/filesystem` — 图片上传走 HTTP API，不需要本地文件系统
- `@capacitor/preferences` — JWT 用 localStorage 已足够
- `@capacitor/keyboard` — iOS 自动处理键盘

---

## 二、任务拆解

### C03-Task001: Push Notifications 迁移（1 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐⭐ |
| **预估** | 1 天 |

**现状**: `sw.js` L143-167 处理 Web Push 的 `push` 事件 → `showNotification`。在 Capacitor WebView 中 Service Worker 的 push 事件**不触发**。需要迁移到 Capacitor Push Notifications 插件。

**Step 1: 安装插件**

```bash
npm install @capacitor/push-notifications
npx cap sync
```

**Step 2: 创建 `frontend/src/services/pushService.js`**

```js
// 封装 Capacitor Push — 替代 sw.js 的 push 事件处理
import { PushNotifications } from '@capacitor/push-notifications';

export async function initPushNotifications() {
  // 1. 请求权限
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') {
    console.log('[push] User denied push permission');
    return;
  }

  // 2. 注册
  await PushNotifications.register();

  // 3. 接收推送（App 前台）
  PushNotifications.addListener('pushNotificationReceived', (notif) => {
    console.log('[push] Received:', notif.title);
    // 可在这里显示 in-app 通知 banner
  });

  // 4. 点击推送（App 冷启动或被点击）
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = action.notification.data?.url;
    if (url) {
      // 导航到目标页面 (React Router)
      window.location.href = url;
    }
  });
}

// 获取设备 Token 发送给后端
export async function getPushToken() {
  const result = await PushNotifications.addListener('registration', (token) => {
    console.log('[push] Device token:', token.value);
    // POST token.value → POST /api/push/register
  });
}
```

**Step 3: 在 `main.jsx` 中初始化**

```jsx
import { Capacitor } from '@capacitor/core';
import { initPushNotifications } from './services/pushService';

// 仅在原生环境初始化 Capacitor Push
if (Capacitor.isNativePlatform()) {
  initPushNotifications();
}
// Web 端继续使用 sw.js 的 Web Push（不变）
```

**Step 4: Firebase / APNs 配置**

```bash
# iOS: Xcode → Signing & Capabilities → Push Notifications
#        生成 APNs Key → 上传到 Firebase Cloud Messaging
# Android: google-services.json → android/app/
```

**验收标准**:
- [ ] Capacitor iOS App 可以请求推送权限
- [ ] Capacitor Android App 可以请求推送权限
- [ ] 获取到 device token
- [ ] Web 端推送不受影响（`Capacitor.isNativePlatform()` 分支）
- [ ] 点击推送可以打开 App 内指定页面

---

### C03-Task002: Camera / Photo Picker 集成（0.5 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**现状**: 使用 `<input type="file" accept="image/*">` 触发系统文件选择器。在 Capacitor 中仍可用，但体验不好（不会区分拍照/相册）。

**策略**: **渐进增强，而非替换。** 原生环境用 Capacitor Camera 提供拍照+相册选项，Web 端继续用 `<input type="file">` 降级。

**Step 1: 安装**

```bash
npm install @capacitor/camera
```

**Step 2: 创建 `frontend/src/utils/imagePicker.js`**

```js
import { Capacitor } from '@capacitor/core';

export async function pickImage(source = 'gallery') {
  // Web 端降级：使用 input[type=file]
  if (!Capacitor.isNativePlatform()) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') input.capture = 'environment';
      input.onchange = (e) => resolve(e.target.files[0]);
      input.click();
    });
  }

  // 原生端：使用 Capacitor Camera
  const { Camera, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    resultType: 'base64',  // 或 'uri' 用于直接上传
  });
  return photo;
}
```

**Step 3: 替换所有 `<input type="file">` 调用点**

搜索 `input type="file"` 或 `accept="image"` 的位置，替换为 `pickImage()`。

**验收标准**:
- [ ] Web 端图片选择正常（input 降级）
- [ ] iOS 端可以拍照 + 从相册选择
- [ ] Android 端可以拍照 + 从相册选择
- [ ] FormData 上传与后端 Multer 兼容

---

### C03-Task003: StatusBar + SplashScreen 配置（0.5 天）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐ |
| **预估** | 0.5 天 |

**Step 1: StatusBar**

```bash
npm install @capacitor/status-bar
```

在 `main.jsx` 中:

```js
import { StatusBar, Style } from '@capacitor/status-bar';

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark });           // 深色文字
  StatusBar.setBackgroundColor({ color: '#ffffff' });  // 白底
}
```

**Step 2: SplashScreen**

```bash
npm install @capacitor/splash-screen
```

在 `main.jsx` 中:

```js
import { SplashScreen } from '@capacitor/splash-screen';

// React 渲染完成后隐藏启动画面
SplashScreen.hide();
```

启动画面资源:
```
frontend/public/splash/
├── splash-640x1136.png     (iPhone SE)
├── splash-750x1334.png     (iPhone 8)
├── splash-1125x2436.png    (iPhone X)
├── splash-1242x2688.png    (iPhone 11 Pro Max)
├── splash-1284x2778.png    (iPhone 14 Pro Max)
└── splash-1080x2400.png    (Android)
```

**验收标准**:
- [ ] iOS 状态栏文字颜色与页面背景匹配
- [ ] Android 状态栏颜色与页面背景匹配
- [ ] App 冷启动时显示 Splash Screen
- [ ] React 渲染完成后 Splash Screen 自动消失

---

## 三、Capacitor 环境检测工具

所有原生插件调用都应包裹在 `Capacitor.isNativePlatform()` 检查中，确保 Web 端不受影响：

```js
// frontend/src/utils/platform.js
import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isWeb = () => Capacitor.getPlatform() === 'web';
```

## 四、完成定义 (DoD)

- [ ] Push Notifications 可在 iOS/Android 上接收
- [ ] Push 点击可跳转 App 内页面（如 `/post/123`）
- [ ] Web 端 Push 不受影响（sw.js 继续工作）
- [ ] Camera 拍照 + 相册选择在 iOS/Android 上可用
- [ ] Web 端图片上传不受影响（input 降级）
- [ ] StatusBar 样式在 iOS/Android 上正确
- [ ] Splash Screen 冷启动展示正常
- [ ] 所有 `Capacitor.isNativePlatform()` 分支正确
