# <Module Name> — Module Design Document

**模块编号**: M0X
**版本**: V1.0
**编写日期**: <YYYY-MM-DD>
**架构依据**: `docs/03-Architecture/<feature>-architecture.md`

---

## 一、模块定位

<What is this module's purpose in the system?>

> "<One-line positioning statement>"

### 核心职责
- <responsibility 1>
- <responsibility 2>

### 不承担
- <explicitly out of scope>

---

## 二、页面 / 屏幕结构

```
<页面/屏幕名称>
├── <区域1>
│   ├── <子组件>
│   └── <子组件>
├── <区域2>
└── <区域3>
```

---

## 三、UI 组件清单

| 组件 | 平台 | 类型 | 说明 |
|------|------|------|------|
| `<ComponentName>` | Web + Mobile | 共享 UI | <说明> |
| `<ComponentName>` | Web | 业务组件 | <说明> |
| `<ComponentName>` | Mobile | 业务组件 | <说明> |

---

## 四、状态管理

| 状态 | 来源 | 管理方式 |
|------|------|----------|
| <状态名> | API | TanStack Query |
| <状态名> | UI | useState / Context |

---

## 五、API 依赖

| 端点 | 用途 |
|------|------|
| `GET /api/x` | <用途> |
| `POST /api/x` | <用途> |

---

## 六、交互细节

### 加载状态
<Skeleton type / Loading spinner>

### 空状态
<EmptyState message / illustration>

### 错误状态
<ErrorState with retry button>

### 边缘情况
- <edge case 1>
- <edge case 2>
