# Task 01: Push 通知 + Firebase 配置

**优先级**: 🟡 P1
**复杂度**: ⭐⭐⭐
**预估工期**: 1-2 天
**依赖**: Task01-Capacitor基础安装（已完成）

---

## 一、现状分析

### 已有基础
- ✅ Capacitor Push Notifications 插件已安装 (`@capacitor/push-notifications`)
- ✅ `pushService.js` 代码已就绪（`window.Capacitor.Plugins.PushNotifications`）
- ✅ Web 端 Push 不受影响（`sw.js` 继续工作）
- ❌ Firebase 项目未创建
- ❌ `google-services.json` 未配置
- ❌ APNs Key 未生成（iOS）
- ❌ 后端 `/api/push/register` 端点状态未知

### 架构

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Capacitor   │───▶│  Firebase     │───▶│  后端 API     │
│  App (JS)    │    │  Cloud Msg    │    │  /api/push/   │
│  get token   │    │  转发推送      │    │  register     │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 二、任务拆解

### L01-Task001: 创建 Firebase 项目

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐ |
| **预估** | 0.5 天 |

**工作内容**:

1. 前往 [Firebase Console](https://console.firebase.google.com/) → 创建项目 "Dorm"
2. 添加 Android App: 包名 `com.dorm.app`
3. 下载 `google-services.json` → 放到 `android/app/`
4. 添加 iOS App: Bundle ID `com.dorm.app`
5. 下载 `GoogleService-Info.plist` → 放到 `ios/App/App/`（后续 iOS 用）
6. 在 Firebase → Cloud Messaging → 生成 VAPID Key（用于 Web Push 统一）

**验收标准**:
- [ ] Firebase 项目创建完成
- [ ] `google-services.json` 已在 `android/app/`
- [ ] Android App 已注册在 Firebase

---

### L01-Task002: 前端 Push 代码验证 + 联调

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:

1. 验证 `pushService.js` 在 Android 真机上能获取 device token
2. 添加调试日志确认 token 获取成功
3. 确认 `registerToken()` 调用 `/api/push/register` 的请求格式
4. 在 Firebase Console → Cloud Messaging → 发送测试推送
5. 验证 App 前台能收到推送，点击能跳转

**推送数据格式**（后端发送时用）:
```json
{
  "to": "<device-token>",
  "notification": {
    "title": "新评论",
    "body": "有人评论了你的帖子"
  },
  "data": {
    "url": "/post/123"
  }
}
```

**验收标准**:
- [ ] `pushService.js` 在真机上成功获取 token
- [ ] Firebase 测试推送能收到
- [ ] 点击推送能跳转到目标页面
- [ ] Web 端 Push 不受影响

---

### L01-Task003: 后端 Push 端点对接（如需）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |

**工作内容**:

1. 检查 `routes/push.js` 的 `/api/push/register` 端点是否支持 Capacitor 格式
2. Capacitor token 注册格式:
```json
POST /api/push/register
{
  "token": "fcm-device-token...",
  "platform": "android"
}
```
3. 如果后端需要改造，新增迁移 + 适配逻辑
4. 确认后端发送推送时使用 FCM HTTP v1 API

**验收标准**:
- [ ] `/api/push/register` 接收 Capacitor 格式的 token
- [ ] 后端能向 Android 设备发送 FCM 推送
- [ ] 127 tests 全部通过（修改后端加测试）

---

### L01-Task004: iOS APNs 证书（可选，有 Mac 时做）

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐⭐ |
| **预估** | 0.5 天 |
| **入口条件** | 需要 Mac + Apple Developer 账号 |

**工作内容**:

1. Apple Developer → Certificates → APNs Key
2. 上传到 Firebase → Cloud Messaging → APNs 认证
3. 在 Xcode 中开启 Push Notifications Capability

**验收标准**:
- [ ] APNs Key 已上传 Firebase
- [ ] iOS 真机能收到推送

---

## 三、完成定义 (DoD)

- [ ] Firebase 项目创建完成，Android App 已注册
- [ ] Android 真机能收到 Firebase 测试推送
- [ ] 点击推送能跳转到 App 内目标页面
- [ ] 后端 `/api/push/register` 支持 Capacitor token 格式
- [ ] Web 端 Push 功能不受任何影响
