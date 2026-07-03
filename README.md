# XMUMDorm（厦马小筑 / Jack Dorm）
## www.xmumdorm.com   .apk is ready.  、
<br>
这两天处于项目动荡期，因为web的前端正在和app的前端分化演进，所以web的前端会一天一个样儿
<br>
### please open it on your smartphone

> 厦门大学马来西亚分校（XMUM）校园社交与生活一站式平台 · All-in-One Campus Platform

🌐 [English Version](README_EN.md) &nbsp;|&nbsp; 🇨🇳 [中文版介绍](README_CN.md)（面向校方）

**Production**: https://xmumdorm-200-lyzz-production.up.railway.app &nbsp;|&nbsp; **Developer**: Ye Jianqin

---

## Tech Stack 技术栈 · Quick Glance

| Layer | Technology |
|------|------|
| Backend | Node.js + Express (17 routes) |
| Database | MySQL (57 migrations) |
| Auth | JWT (student / merchant / admin) |
| Web | React 19 + Vite 7 + Tailwind CSS 4 + Liquid Glass |
| Mobile | Capacitor 8 → Android APK + iOS (ready) |
| Push | JPush（极光推送）— APNs + 华为/小米/OPPO/vivo/FCM |
| State | TanStack Query (React Query v5) |
| Storage | Cloudflare R2 (S3-compatible) |
| Testing | Jest 30 + Supertest (108 backend + 416 mobile = 524 total) |
| CI/CD | Railway + Git |
| i18n | 中文 / English |

---

## Feature Modules 功能模块

🌳 **TreeHole** — Campus social space · 🍽️ **Canteen** — Food & dining platform · 🏛️ **Square** — Info hub · 👥 **Clubs** — Club management · 🛒 **Marketplace** — Second-hand trading · 🏃 **Errands** — Task posting · 📚 **Handbook** — Freshman guide · 📝 **Course Reviews** — Anonymous ratings · 📅 **Schedule** — Weekly calendar · ⭐ **Level System** — XP & badges · ✅ **To-Do** · 📓 **Diary** · 🔔 **Notifications** (6 categories + JPush) · 🛡️ **Admin Dashboard** (user/content/report/audit management)

> 📖 [Full Chinese introduction 完整中文介绍](README_CN.md) &nbsp;|&nbsp; 📖 [Full English introduction 完整英文介绍](README_EN.md)

---

## Key Stats 核心数据

| Metric | Value |
|------|------|
| Commits | **288** |
| Development | 2026.01.27 – 06.08 (**4.5 months**) |
| Codebase | **60,000+ lines** |
| Test Cases | **524** (100% pass) |
| Documentation | **100+ documents** |

---

## Running 快速启动

```bash
# Backend
npm install && npm start

# Web Frontend
cd frontend && npm install && npm run dev

# Android App
npm run build:capacitor && npx cap sync android && npx cap open android

# Tests
npm test
```

---

*Last updated 2026-06-08 · Ye Jianqin · CST2509054@xmu.edu.my*
