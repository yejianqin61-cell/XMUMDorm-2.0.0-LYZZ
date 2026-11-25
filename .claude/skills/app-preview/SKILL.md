---
name: app-preview
description: 在本机 Android 模拟器上预览并自测 XMUMDorm App（app/ 目录，Expo SDK 57）。改了 App 的界面或交互、要看真实画面、要截图、要点按验证、要查红屏或 JS 报错时使用。不用于 Web 前端（frontend/）。
---

# App 本机预览与自测

工具：`app/tools/preview/devicectl.mjs`，在 `app/` 下用 `npm run preview -- <命令>` 或 `node tools/preview/devicectl.mjs <命令>`。
完整手册：`docs/app/test/本机预览与自测.md`。

## 开工三步

```bash
node tools/preview/devicectl.mjs doctor          # 先看哪里没就绪
node tools/preview/devicectl.mjs up --api local  # 起模拟器 + Metro + 打开 App（首次会自动 build，5–15 分钟，放后台跑）
node tools/preview/devicectl.mjs smoke           # 冒烟：四个 Tab 截图 + 红屏/报错检查
```

## 看画面、做操作

- `shot <名字>` 打印 PNG 路径 → **用 Read 工具打开这张图**才算看到画面。
- `ui` 打印当前页的可点元素（文本、无障碍标签、testID、中心坐标）。**先 `ui` 再 `tap`**，不要凭截图猜坐标。
- `tap --text 课程表` / `tap --id <testID>` / `tap --desc <无障碍标签>` / `tap <x> <y>`
- `wait <文本>`：等页面加载出某段文字，比 sleep 可靠。
- `launch /tools/timetable`：深链直达某路由（`xmumdorm://` 方案，路由同 `src/app/` 的文件路径）。
- `logs`：JS 日志与崩溃；`logs clear` 后再复现，日志才干净。
- `theme dark|light`、`font 1.3`：验证双主题与大字号。

## 改代码后

JS/TSX 改动 Metro 会热更新，直接 `shot` 即可；看不到变化就 `restart`。
改了 `app.json`、原生依赖或 config plugin → 必须重新 `build`。

## 规矩

- 后端三种模式见手册 §4。日常：`devicectl backend start --prod-db` + `devicectl metro --api local`（本 worktree 后端代码，**连生产库**）。
- 线上数据下（`--prod-db` 或 `--api prod`）**只浏览**：`tap` 会拦下发布/提交/下单/删除等写按钮。真要写，必须是所有者在对话里明确要求的那一次，加 `--allow-write`，并在汇报里写明写了什么。
- 登录只用 `app/.preview/test-account.json` 里的专用测试账号（`devicectl login`）；⛔ 不用任何人的真实账号。
- 汇报时附截图路径，并说明是在哪台 AVD、哪种主题、哪个 api 下看到的。
- 截图与 UI 树只是证据，验收结论仍按 `docs/app/test/` 下的清单写。
