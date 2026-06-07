# Task 01: Capacitor 基础安装与配置

**优先级**: 🔴 P0 — 所有后续 Task 的依赖
**复杂度**: ⭐
**预估工期**: 0.5 天
**依赖**: —

---

## 一、现状分析

### 已有基础
- ✅ Vite 7 构建产出 `frontend/dist/`
- ✅ `index.html` 已含 viewport meta + manifest + PWA 图标
- ✅ API 代理在 `vite.config.js` 已配置 (`/api → 127.0.0.1:4040`)
- ✅ JWT Token 通过 localStorage/AsyncStorage → Capacitor 中 localStorage 可用
- ⚠️ 当前 `package.json` 在 `frontend/` 子目录，需确定 Capacitor 安装位置

### 安装位置决策

**推荐方案**: Capacitor 安装在项目根目录（monorepo 根），读取 `frontend/dist/` 作为 webDir。

```
XMUMDorm-2.0.0-LYZZ/
├── capacitor.config.ts    ← 根目录
├── frontend/              ← Vite 项目 (不改)
│   └── dist/              ← vite build 产物
├── ios/                   ← npx cap add ios 生成
├── android/               ← npx cap add android 生成
└── ...
```

---

## 二、任务拆解

### C01-Task001: 安装 Capacitor 依赖

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐ |
| **预估** | 0.25 天 |

**工作内容**:

```bash
# 在项目根目录执行
npm install --save-dev @capacitor/cli
npm install @capacitor/core @capacitor/ios @capacitor/android
```

**验收标准**:
- [ ] `@capacitor/cli` 出现在 `devDependencies`
- [ ] `@capacitor/core` 出现在 `dependencies`
- [ ] `@capacitor/ios` 和 `@capacitor/android` 已安装

---

### C01-Task002: 初始化 Capacitor 配置

| 项目 | 内容 |
|------|------|
| **复杂度** | ⭐ |
| **预估** | 0.25 天 |

**工作内容**:

1. 创建 `capacitor.config.ts`（根目录）:

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dorm.app',          // 唯一标识，不可更改
  appName: 'Dorm',                // App 名称
  webDir: 'frontend/dist',        // Vite 构建输出目录

  // 开发模式：连接 Vite dev server（localhost→手机需要同一局域网）
  server: process.env.NODE_ENV === 'development' ? {
    url: 'http://192.168.x.x:5173',   // 替换为你的局域网 IP
    cleartext: true,                    // 允许 HTTP（开发环境）
  } : undefined,

  ios: {
    contentInset: 'always',        // 自动处理 Safe Area
    scheme: 'dorm',                 // URL Scheme
  },
  android: {
    allowMixedContent: true,       // 允许 HTTP 请求
  },
};

export default config;
```

2. 初始化原生平台:

```bash
npx cap add ios
npx cap add android
```

3. 更新 `.gitignore`:

```
# Capacitor
ios/
android/
.capacitor/
```

4. 更新 `frontend/vite.config.js` — 为 Capacitor 配置构建 base:

```js
export default defineConfig({
  base: './',  // ← 关键：相对路径，让 Capacitor 能从 file:// 加载
  plugins: [react(), tailwindcss()],
  server: { ... },
});
```

5. 验证:

```bash
npm run build --prefix frontend    # 构建 Web
npx cap sync                        # 同步到 iOS/Android
npx cap open ios                    # 在 Xcode 中打开
```

**验收标准**:
- [ ] `capacitor.config.ts` 存在且内容正确
- [ ] `ios/` 和 `android/` 目录已生成
- [ ] `npx cap sync` 无错误
- [ ] `frontend/vite.config.js` 的 `base` 设为 `'./'`
- [ ] `.gitignore` 已添加 `ios/` `android/` `.capacitor/`

---

## 三、关键决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 安装位置 | 根目录 | Monorepo 根目录管理，ios/android 在顶层便于 CI |
| webDir | `frontend/dist` | Vite 默认输出，不需修改 |
| base URL | `./` | 相对路径使 Capacitor 能从 file:// 协议加载 |
| dev server | `server.url` 字段 | 开发时热更新，不需要每次构建 |
| contentInset | `always` | 让 iOS WKWebView 自动处理 safe area |

## 四、完成定义 (DoD)

- [ ] `npx cap sync` 执行成功
- [ ] `npm run build --prefix frontend` 正常产出 `dist/`
- [ ] Xcode 中能打开并运行 iOS 项目
- [ ] Android Studio 中能打开并运行 Android 项目
- [ ] WebView 中显示的是你的 Dorm 首页
