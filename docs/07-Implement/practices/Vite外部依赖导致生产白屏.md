# `build.rollupOptions.external` 造成的「生产白屏、开发正常」

> 一次真实事故的复盘（2026-09-26）。适用于任何「只在生产构建里出现、dev 完全正常」的白屏。

## 症状

- **线上** `https://www.xmumdorm.com/advertisement/191`（以及全部 `/advertisement/:id`）**整页白屏**，
  `document.body.innerText.length === 0`，没有任何错误 UI。
- **本地 `npm run dev`**（Vite dev server，同一份代码、同一个后端）**完全正常**。
- 浏览器控制台只有一行，且是模块级的：

```
Failed to resolve module specifier "@capacitor/browser".
Relative references must start with either "/", "./", or "../".
```

## 根因

`frontend/vite.config.js` 里：

```js
build: {
  rollupOptions: {
    // Capacitor plugins are available at runtime in the WebView,
    // but not installed in frontend/node_modules. Vite should skip them.
    external: (id) => id.startsWith('@capacitor/'),
  },
}
```

`external` 的含义是「**不要打包它**，把 import 原样留在产物里」——这对打包给 WebView 的原生壳是合理的。
但 `shared/components/AdvertisementDetailView.jsx` 在**模块顶层**静态引用了它：

```js
import { Browser } from '@capacitor/browser';   // ❌
import { Capacitor } from '@capacitor/core';    // ❌
```

于是产物 `dist/assets/AdvertisementDetail-*.js` 顶部留下了裸模块说明符 `"@capacitor/browser"`。
浏览器**只能解析相对路径或绝对 URL**，解析失败 → 这个 lazy route 的 chunk 根本加载不起来 →
路由组件永远不会渲染 → 白屏。

## 为什么 dev 完全正常（关键）

`@capacitor/*` 只装在**仓库根** `node_modules/`（被 `frontend-app/` 使用），
**不在 `frontend/node_modules/`**。Vite dev server 走 Node 解析、能向上找到根 `node_modules`，
所以 dev 一切正常；而 `external` 让构建产物丢掉了解析结果。

**结论：这类缺陷永远无法用 dev server 验证。** 只跑 `npm run dev` 的验证流程对它完全失效。

## 修复

把静态导入改成「**只在原生平台运行时动态导入**」，Web 端永不求值：

```js
function isNativePlatform() {
  return typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
}

async function openExternalUrl(url) {
  if (isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');   // ✅ 只在原生壳里执行
    await Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
```

`Capacitor` 本身也不再导入——原生壳会注入 `window.Capacitor`，Web 上它是 `undefined`，
`?.` 链安全退化到 `window.open`，行为与修复前完全一致。

修复后产物核对（决定性的检查）：

```
AdvertisementDetail-*.js : 静态 @capacitor 引用 = 0，动态 import("@capacitor/browser") = 1
```

## 正确的验证方式

**必须用构建产物验证**，不能只看 dev：

```bash
cd frontend
npx vite build
npx vite preview --port 4173        # preview 继承 server.proxy，所以 /api 仍会转发到后端
# 然后打开 http://localhost:4173/<被测路由>，看 body 文本长度与控制台
```

本次的实测对照：

| | `body` 文本长度 | 控制台 |
|---|---|---|
| 修复前（dist） | **0** | `Failed to resolve module specifier "@capacitor/browser"` |
| 修复后（dist） | **295** | 无错误 |

## 规约

1. **凡是 `external` 里列出的依赖，禁止在模块顶层静态 `import`。** 只能动态 `import()`
   且必须包在「运行到该平台才会走到的分支」里。
2. **新增/修改懒加载路由的页面后，必须至少用 `vite build` + `vite preview` 跑一遍该路由。**
   只跑 dev server 不足以证明线上可用。
3. 判断「白屏」的第一现场是**浏览器控制台的模块级报错**（module specifier / 404 chunk），
   而不是 React 报错——React 根本没机会执行。
4. 同类隐患的通用探测手段：构建后扫产物里是否残留裸模块说明符

   ```bash
   grep -oE 'from\s*"[^./][^"]*"' frontend/dist/assets/*.js | sort -u
   ```
