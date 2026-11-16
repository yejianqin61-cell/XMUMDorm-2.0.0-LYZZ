# 厦马小筑 · Moodle 截止日期（浏览器扩展）

把你在 Moodle（`l.xmu.edu.my`）上的作业和测验截止时间，显示到厦马小筑 Web 的「学习日历」。需求见 [Moodle 浏览器扩展需求](../docs/01-Requirement/Moodle浏览器扩展/Moodle浏览器扩展需求.md)，实现见 [实现记录](../docs/07-Implement/Moodle浏览器扩展/Moodle浏览器扩展实现记录.md)。

## 安装（内测：加载已解压的扩展）

1. Chrome 打开 `chrome://extensions`（Edge 打开 `edge://extensions`），右上角打开「开发者模式」。
2. 点「加载已解压的扩展程序」，选这个 `extension/` 文件夹。
3. 在同一个浏览器里登录并打开任意 Moodle 页面，扩展会自动同步（10 分钟内不重复）。
4. 打开厦马小筑的「我的 → 学习日历」，就能看到 Moodle 截止。

## 它做了什么、没做什么

- 在 Moodle 页面里（同源）调用 Moodle 官方 AJAX：在读课程、截止事件、课程活动列表，一次同步最多 3 批请求。
- 截止判定和 App 一样：作业的 due、测验的 close、活动的预期完成日期；必须对上课程和活动链接。
- 结果只存在本机 `chrome.storage.local`，按 Moodle 用户分开。**不上传任何服务器**，也不发给厦马小筑后端。
- 不读 cookie、不碰密码；`sesskey` 只在当次请求里用，不保存。
- 厦马小筑网页向扩展要数据时，只拿到标题、课程名、截止时间、Moodle 链接、是否已完成。
- 弹窗里可以「立即同步」和「清除 Moodle 数据」。

## 权限

| 权限 | 用途 |
| --- | --- |
| `storage` | 在本机保存同步结果 |
| `https://l.xmu.edu.my/*` | 弹窗找到已打开的 Moodle 页面，让它立即同步 |

内容脚本只注入两处：Moodle，以及厦马小筑 Web（`www.xmumdorm.com`、`xmumdorm.com`、本地开发 `localhost:5173`）。生产域名清单待需求 Q5 确认。

## 开发

- 核心逻辑在 `shared/moodle/moodle-core.js`（扩展和测试共用）。改完执行 `npm run extension:sync-core` 拷到 `lib/`；`__tests__/shared/moodleCore.test.js` 会检查两份一致。
- 测试：`npx jest __tests__/shared/moodleCore.test.js __tests__/shared/moodleBridge.test.js`。同步脚本的测试在 Node 的 `vm` 里运行，`chrome`、`fetch` 和 `document` 都是模拟的。
