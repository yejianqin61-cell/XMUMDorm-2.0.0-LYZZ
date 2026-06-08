# Task 02: Android Release 签名 + Google Play 上架

**优先级**: 🟡 P1
**复杂度**: ⭐⭐
**预估工期**: 1 天
**依赖**: Task01-Capacitor基础安装（已完成）

---

## 一、现状分析

### 当前状态
- ✅ Debug APK 已生成并安装到真机
- ✅ App 功能正常（API 联通、Safe Area 适配、UI 正常）
- ❌ Debug APK 无法上架 Google Play
- ❌ 未生成 Release 签名密钥 (keystore)
- ❌ Google Play Console 未创建应用

### Debug vs Release APK 区别

| 维度 | Debug APK | Release APK |
|------|-----------|-------------|
| 签名 | 开发调试签名 | 正式发布签名 (keystore) |
| 体积 | 较大 | 较小（minify + R8） |
| 调试 | 可 USB 调试 | 不可调试 |
| 上架 | ❌ 不允许 | ✅ 可以 |
| 分发 | 手动传文件 | Google Play / 网站 |

---

## 二、任务拆解

### L02-Task001: 生成 Release Keystore

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐ |
| **预估** | 0.25 天 |

**工作内容**:

```bash
# 生成密钥（在项目根目录执行）
keytool -genkey -v \
  -keystore android/app/dorm-release.keystore \
  -alias dorm \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**需要填写的信息**:
- 密钥库密码（记住！）
- 姓名 → 你的名字
- 组织 → XMUMDorm
- 国家代码 → CN

⚠️ **keystore 绝对不能丢，不能提交到 Git**

**验收标准**:
- [ ] `dorm-release.keystore` 已生成
- [ ] 密码已记录在安全的地方
- [ ] `.gitignore` 已确认排除 keystore 文件

---

### L02-Task002: 配置 Android Release 构建

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐ |
| **预估** | 0.25 天 |

**工作内容**:

1. 创建 `android/app/release-signing.properties`（或直接在 `build.gradle` 中配置）:

```
storeFile=dorm-release.keystore
storePassword=<你的密码>
keyAlias=dorm
keyPassword=<你的密码>
```

2. Android Studio → **Build → Generate Signed Bundle / APK → APK** → 选择 keystore → Release

**验收标准**:
- [ ] Release APK 生成成功
- [ ] APK 可以安装到真机
- [ ] App 功能正常

---

### L02-Task003: Google Play Console 上架

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐⭐ |
| **预估** | 0.5 天 |
| **费用** | $25 一次性 |

**工作内容**:

1. 注册 [Google Play Console](https://play.google.com/console/) ($25)
2. 创建应用 → 填写:
   - 应用名称: Dorm
   - 默认语言: 中文（简体）
   - 应用类型: 社交
3. 应用内容:
   - 隐私政策 URL（Task03 产出）
   - 内容分级问卷
   - 目标受众: 18 岁以上
4. 上传 Release AAB (Android App Bundle，比 APK 小，推荐)
5. 截图: 手机截图 × 4-8 张，1080p 分辨率
6. 应用描述（中英双语）

**Google Play 截图要求**:
- 分辨率: 1080 × 1920（竖屏）
- 格式: JPEG 或 24-bit PNG
- 至少 2 张，最多 8 张

**验收标准**:
- [ ] Google Play Console 应用已创建
- [ ] 内容分级问卷已完成
- [ ] Release AAB 已上传
- [ ] 应用截图已上传
- [ ] 提交审核

---

## 三、关键注意事项

| 项目 | 说明 |
|------|------|
| keystore 备份 | 丢了这个，永远无法更新 App。存到云盘 + U 盘双重备份 |
| 审核时间 | Google Play 首次审核通常 1-3 天 |
| App ID 不可改 | `com.dorm.app` 一旦发布永久锁定 |
| 版本号 | 第一次发布用 `versionCode=1, versionName=1.0.0` |
| 敏感权限 | Push 需要声明 `POST_NOTIFICATIONS` 权限 |

## 四、完成定义 (DoD)

- [ ] Release keystore 已生成且安全备份
- [ ] Release AAB 已构建并通过真机验证
- [ ] Google Play Console 应用信息填写完整
- [ ] 提交审核
