# 上线准备 — 任务总览

> ⚠️ **本计划的工期口径已失效（写于 2026-06，按"3–5 天可上架"估算）。**
> 关键更正：① 2023-11-13 之后创建的**个人** Play 开发者账号必须**≥12 名测试者连续封闭测试 14 天**，之后还要过生产访问审核（≤7 天）与发布审核（最多 7 天），理论最短 **3–4.5 周**；② **自 2026-08-31 起新应用与更新必须 target API 36**；③ UGC 应用还缺"屏蔽用户""应用内注销（需删除该用户 UGC）""条款接受"，其中两项**需要改后端**。
> 最新调研与行动顺序见 [`../../06-Analyze/tech-research/RN基座选型与商店上架调研.md`](../../06-Analyze/tech-research/RN基座选型与商店上架调研.md)（§5 Play / §6 iOS / §7 一个月行动计划）。

**依据**: 开发公报 2026-06-07 — 短期待办
**目标**: Android App 从 Debug APK → Google Play 正式上架
**总任务数**: 16 个子任务
**总预估工期**: 3-5 天

---

## 任务矩阵

| Task | 名称 | 优先级 | 复杂度 | 预估 | 依赖 |
|------|------|--------|--------|------|------|
| [Task01](Task01-Push通知与Firebase配置.md) | Push 通知 + Firebase 配置 | 🟡 P1 | ⭐⭐⭐ | 1-2 天 | — |
| [Task02](Task02-Android签名与GooglePlay上架.md) | Android Release 签名 + Google Play 上架 | 🟡 P1 | ⭐⭐ | 1 天 | — |
| [Task03](Task03-隐私政策与品牌优化.md) | 隐私政策页面 + 启动画面品牌优化 | 🔵 P2 | ⭐⭐ | 0.5-1 天 | — |
| [Task04](Task04-真机多机型验收.md) | 真机多机型 UI 验收 | 🟡 P1 | ⭐⭐ | 1 天 | Task01 |

---

## 执行顺序

```
Day 1 上午:  Task03 — 隐私政策 + 启动画面（独立，先做）
Day 1 下午:  Task01 — Firebase 项目 + Push 配置
Day 2:       Task01 — APNs/FCM 证书 + 前后端联调
Day 3:       Task02 — Release 签名 + Google Play 提交
Day 4:       Task04 — 多机型验收 + Bug 修复
```

---

## 上线前验收清单

- [ ] Push 通知在 Android 真机上收到
- [ ] Release APK 签名正确，可安装
- [ ] Google Play Console 审核通过
- [ ] 隐私政策页面可访问
- [ ] 启动画面品牌正确
- [ ] 小米 / OPPO / 三星 三种机型 UI 无异常
- [ ] 108 tests 全绿
