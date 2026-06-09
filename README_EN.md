# XMUMDorm (厦马小筑 / Jack Dorm)

> All-in-One Campus Social & Lifestyle Platform for XMUM
>
> **Production**: https://xmumdorm-200-lyzz-production.up.railway.app
> **Developer**: Ye Jianqin (CST2509054)

---

## Overview

XMUMDorm is a full-stack campus platform built specifically for the Xiamen University Malaysia (XMUM) ecosystem, covering four major scenarios: **Social**, **Dining**, **Academics**, and **Daily Life**. The project follows a **Spec-Driven, Agent-Native** architecture with a 10-stage software engineering lifecycle methodology.

---

## Tech Stack

| Layer | Technology | Notes |
|------|------|------|
| **Backend Runtime** | Node.js + Express | 17 route modules, RESTful API |
| **Database** | MySQL | 57 incremental migrations, parameterized queries, soft deletes |
| **Auth** | JWT | Bearer Token, role system (student/merchant/admin) |
| **Web Frontend** | React 19 + Vite 7 + React Router | 99 pages, TanStack Query, CSS liquid glass design |
| **Mobile App** | Capacitor 8 + Android | 100% Web code reuse, native APK packaging; iOS project ready |
| **Push Notifications** | JPush (极光推送) | Multi-vendor: APNs / Huawei / Xiaomi / OPPO / vivo / FCM |
| **State Management** | TanStack Query (React Query v5) | Server-state caching + optimistic updates |
| **Styling** | CSS Modules + Tailwind CSS 4 + Liquid Glass | 245 backdrop-filter/blur effects |
| **Image Storage** | Cloudflare R2 (S3-compatible) | Object storage + CDN |
| **Testing** | Jest 30 + Supertest | 108 test cases, 100% pass rate |
| **CI/CD** | Railway (backend) + Git | Automatic deployment |
| **i18n** | Chinese / English | LanguageContext + bilingual Tag system |

---

## Feature Modules

### 🏠 Authentication
- Student ID / Email + Password login
- Dual-role registration (student / merchant)
- JWT auth + guest mode
- Email verification codes
- Route guards (AuthGuard)

### 🌳 TreeHole
Anonymous/semi-anonymous campus social space
- Text + image posts (GIF supported, up to 3 images)
- Two-level comments & replies
- Like/unlike (optimistic updates)
- Bilingual tag system + personal tag customization
- Waterfall layout + infinite scroll
- Admin hide/delete capabilities

### 🍽️ Canteen
Campus food & dining platform
- 4-level structure: Region → Shop → Category → Product
- Product reviews with images + ratings
- Per-region leaderboards (composite scores)
- Food Square (waterfall posts)
- Favorites + search
- Merchant dashboard (shop/product CRUD)

### 🏛️ Square
Campus info aggregation hub
- Trending topics feed
- Campus Moments (real-time posts)
- Full-screen carousel
- 4-grid function entrances
- Comment & like system

### 👥 Clubs
- Create / join / follow clubs
- Club feed posting
- Member management
- Club square

### 🛒 Second-hand Marketplace
- Category tabs + filtering
- Item posting (up to 4 images)
- Favorites + search
- Buyer/seller chat
- Status management (available/sold)

### 🏃 Errands
- Task posting & accepting
- Status tracking

### 📚 Campus Handbook
- Freshman guide article system
- Comments / favorites / likes
- Article editor

### 📝 Course Reviews
- Semester-based anonymous reviews
- Ratings + tags + comments
- Editable / deletable

### 📅 Schedule
- Weekly calendar view
- Today's classes
- Pre-class reminders

### ⭐ Level System
- XP accumulation (post/comment/like/check-in)
- Level badges + progress bars
- Level-up modal effects
- Leaderboards

### ✅ To-Do
- Daily task CRUD
- Completion toggle

### 📓 Diary
- Diary CRUD
- "On This Day" feature

### 🔔 Notifications & Push
- 6-category notification inbox
- JPush multi-vendor push delivery
- iOS: APNs | Android: Huawei / Xiaomi / OPPO / vivo / FCM
- Web Push (PWA)

### 🛡️ Admin Dashboard
- Dashboard data panel
- User management (list/detail/ban/mute)
- Report review center
- Content management (8 modules unified)
- System announcements
- Sensitive word configuration
- Audit logs

### 📄 Other
- Privacy Policy + Terms of Service (`/privacy` `/terms`)
- Bilingual toggle (EN/ZH)
- PWA support (offline-ready)
- Liquid glass design system (245 backdrop-filter/blur instances)

---

## Development Timeline

```
2026.01.27 ─── Project launch, auth module complete
2026.01-02  ── Posts system + Canteen + Leaderboards backend
2026.03      ── Full frontend development (99 pages) + React Router + TanStack Query
2026.03.10   ── First Railway production deployment
2026.03-04   ── Continuous refinement: UI overhaul · performance · bilingual · liquid glass
2026.04      ── Handbook · Course Reviews · Marketplace · Errands · Clubs · Notifications
2026.05      ── Admin Dashboard · Report System · Level System · Sensitive Word Filter
2026.05.31   ── Test framework established (108 cases, 100% pass)
2026.06.01   ── React Native mobile development (69 screens + 416 tests)
2026.06.06   ── Agent-Native architecture · Docs restructured (10-layer lifecycle)
2026.06.07   ── Strategic pivot to Capacitor · Android APK on real device
2026.06.08   ── Release signing · JPush integration · Privacy Policy · Store prep
```

### Key Metrics

| Metric | Value |
|------|------|
| Total Commits | **288 commits** |
| Development Period | **Jan 27 – Jun 8, 2026 (4.5 months)** |
| Backend Code | 17 routes + 5 middleware + 7 services ≈ **17,000 lines** |
| Frontend Code | 99 pages + 60 components ≈ **30,000 lines** |
| Mobile Code | 69 screens + 416 tests ≈ **14,000 lines** |
| Tests | 108 (backend) + 416 (mobile) = **524 total** |
| DB Migrations | **57** incremental migrations |
| Documentation | **100+** Markdown/HTML documents |

---

## Production Environment

### Current Status

| Service | Status | URL |
|------|:--:|------|
| Backend API | 🟢 Live | `xmumdorm-200-lyzz-production.up.railway.app` |
| Web Frontend | 🟢 Live | Same domain |
| MySQL Database | 🟢 Live | Railway MySQL managed |
| Object Storage | 🟢 Live | Cloudflare R2 |
| Email Service | 🟢 Live | SMTP (Office 365 @xmu.edu.my) |
| Android App | 🟢 APK Ready | Release signed, 38MB |
| Push Service | 🟡 Configuring | JPush (AppKey configured) |

### Android App

- **Build**: Capacitor 8 — 100% code reuse from Web, packaged as native APK
- **Signing**: Release keystore with automated build config
- **Safe Area**: Cross-platform adaptation (JS native height injection + CSS 100dvh)
- **Push**: JPush multi-vendor delivery (Huawei / Xiaomi / OPPO / vivo / FCM / APNs)
- **Stores**: Domestic Android stores + Google Play in preparation

---

## Running the Project

### Backend
```bash
npm install
# Configure .env (see .env.example)
npm start          # Production mode
npm run dev        # Dev mode (nodemon)
```

### Web Frontend
```bash
cd frontend
npm install
npm run dev        # Vite dev server (localhost:5173)
npm run build      # Production build
```

### Android App
```bash
npm run build:capacitor    # Build for Capacitor
npx cap sync android       # Sync to Android project
npx cap open android       # Open in Android Studio
# Build → Build APK
```

### Testing
```bash
npm test                   # 108 integration test cases
```

---

## License

Personal project by a XMUM student. All rights reserved.

---

*Last updated: 2026-06-08 · Developer: Ye Jianqin · Contact: yejianqin61@gmail.com*
