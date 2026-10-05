/**
 * ⚠️ **备用配置插件 —— 当前刻意「不启用」**（请先读这段再决定要不要挂它）
 *
 * 背景（R1）：Android 上"返回键直接退出 App"的**真正危险组合**是
 *   **API 33–35 设备 + targetSdkVersion 36 + predictive back 被打开**。
 * Expo SDK 57 的模板默认已写 `android.predictiveBackGestureEnabled: false`
 * （= `android:enableOnBackInvokedCallback="false"`），因此**默认是安全的**。
 *
 * 为什么不现在就挂这个插件：
 *   1. 它与 `app.json` 的 `predictiveBackGestureEnabled` 表达的是**同一件事**；
 *      现在挂上等于用插件覆盖字段，将来 SDK 把默认值翻成 `true` 时我们会**失去感知**。
 *   2. 它的用途是"字段不生效时的兜底"。
 *
 * 什么时候挂（按顺序）：
 *   ① 先跑 `npm run prebuild:android`，确认产物
 *      `android/app/src/main/AndroidManifest.xml` 里确实有
 *      `android:enableOnBackInvokedCallback="false"`（这是唯一能证明字段落地的客观证据）；
 *   ② 断言失败（字段没写进 manifest）→ 把它加进 `app.json` 的 `plugins` 数组，再 prebuild；
 *   ③ 若真机仍出现"返回键直接退出"→ 记录进 `docs/app/evaluation/R1-Android返回键结论.md` 并升级为 ADR。
 *
 * 依据：docs/app/evaluation/R1-Android返回键结论.md · 宪法 4.4 / 4.5。
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withDisablePredictiveBack(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const application =
      configWithManifest.modResults.manifest.application?.[0] ?? undefined;
    if (application) {
      application.$ = application.$ ?? {};
      application.$['android:enableOnBackInvokedCallback'] = 'false';
    }
    return configWithManifest;
  });
};
