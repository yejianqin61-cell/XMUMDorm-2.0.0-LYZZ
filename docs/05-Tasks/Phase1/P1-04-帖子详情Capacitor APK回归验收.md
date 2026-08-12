# P1-04 - 帖子详情 Capacitor APK 回归验收

## Parent

GitHub Issue #4：统一 App 帖子详情原生浏览体验

## What to build

在真实 Capacitor Android APK 中完成帖子详情交互回归，确认页面级横向锁定在触摸设备上有效，同时不破坏媒体组件和系统返回行为。

## Blocked by

- P1-03 - 多类型帖子详情入口统一迁移

## Acceptance criteria

- [ ] 使用 Debug 或 Release-like APK 至少验证树洞、热搜、校园通知、社团帖子和社团活动详情。
- [ ] 每类详情均验证左右滑动、上下滚动、多图切换、图片预览、评论输入和系统返回键。
- [ ] 横向滑动不出现白边、相邻页面、页面抖动或路由变化。
- [ ] 记录设备型号、Android 版本、APK 构建版本和结果；失败用例必须附复现步骤。
- [ ] Web 浏览器至少完成一次冒烟回归，确认没有明显横向溢出回归。
