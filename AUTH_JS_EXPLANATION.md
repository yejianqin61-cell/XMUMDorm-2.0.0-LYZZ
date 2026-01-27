# `routes/auth.js` 逐行代码解释（清晰版）

> 创建时间: 2026-01-27  
> 讲解目标: **每行代码**讲清楚：**作用** / **类型** / **上下衔接** / **与其他文件联动**

---

## 你先记住这张“联动地图”

- **`server.js`** 把这个路由模块挂载到 `/api/auth`：
  - 所以本文件里写的 `router.post('/login')`，最终完整地址是 **`POST /api/auth/login`**
- **`database.js`** 提供 `query()`：
  - 本文件用它去 MySQL 查/写 `users` 表..
- **前端 `html/register.js`** 调用： 
  - `POST /api/auth/send-verification-code`
  - `POST /api/auth/register`
- **前端 `html/login.js`** 调用：
  - `POST /api/auth/login`（提交 `student_id` + `password`）

---

## 文件全文（带行号）与逐行解释

下面的行号对应 `routes/auth.js` 的 `L1`、`L2`…（你在编辑器里看到的那套行号）。

---

## A. 文件头注释（L1–L13）

### L1
- **代码**：`/**`
- **类型**：块注释开始（JSDoc 风格）
- **作用**：写给人看的“文件说明”，不参与运行

### L2–L13
- **类型**：注释内容
- **作用**：说明这个文件负责的功能（注册/登录/验证码接口），以及时间戳
- **联动**：无（只影响阅读）

---

## B. 引入依赖 + 创建 Router（L15–L35）

### L15
- **类型**：单行注释
- **作用**：提示下面两行在做什么

### L16
- **代码**：`const express = require('express');`
- **类型**：CommonJS 引入；`const` 常量
- **作用**：拿到 Express 框架模块
- **衔接**：下一行会用 `express.Router()`

### L17
- **代码**：`const router = express.Router();`
- **类型**：Router 实例
- **作用**：创建“子路由容器”，后面所有 `router.post(...)` 都注册在这里
- **联动**：`server.js` 的 `app.use('/api/auth', authRoutes)` 会把它挂到主应用上

### L19–L20
- **L20 代码**：`const bcrypt = require('bcryptjs');`
- **类型**：模块引入
- **作用**：注册时 `hash` 密码；登录时 `compare` 密码

### L22–L23
- **L23 代码**：`const jwt = require('jsonwebtoken');`
- **类型**：模块引入
- **作用**：注册/登录成功后生成 JWT token
- **联动**：`middleware/auth.js` 会用同一个 `JWT_SECRET` 去验 token

### L25–L26
- **L26 代码**：`const { query } = require('../database');`
- **类型**：解构导入
- **作用**：调用 MySQL（查重、插入、查询用户）
- **联动**：依赖 `database.js` 里的连接池与 `query()`

### L28–L31
- **L29**：`JWT_SECRET`（常量）
  - **作用**：JWT 签名密钥（生产必须改为强随机）
  - **联动**：签发 token 与校验 token 都依赖它
- **L31**：`JWT_EXPIRES_IN = '7d'`
  - **作用**：token 7 天过期

### L33–L35
- **L35**：`MERCHANT_INVITE_CODE`
- **类型**：常量
- **作用**：商家注册的邀请码

---

## C. 接口：发送邮箱验证码（预留）（L37–L92）

### L43
- **类型**：注册 POST 路由 + 异步处理函数
- **联动**：最终路径 `POST /api/auth/send-verification-code`（来自 `server.js` 挂载）

### L44–L45
- **L44**：`try` 捕获异常
- **L45**：从 `req.body` 解构 `email`
  - **类型**：对象解构
  - **联动**：需要 `express.json()`（在 `server.js` 里 `app.use(express.json())`）

### L49–L54（邮箱不能为空）
- **类型**：条件判断 + 立即返回（`return res.status(...).json(...)`）
- **作用**：阻止后续逻辑继续执行（return 很关键）

### L58–L63（邮箱后缀校验）
- **类型**：字符串方法 `endsWith`
- **作用**：限制只能用学校邮箱 `@xmu.edu.my`

### L65–L72（TODO）
- **类型**：注释
- **作用**：列出未来要补齐的真实发送逻辑

### L75–L83（临时成功响应）
- **类型**：JSON 响应
- **重点**：`...(process.env.NODE_ENV === 'development' && {...})`
  - **类型**：短路逻辑 + 对象展开
  - **作用**：仅开发环境返回测试验证码，生产环境不返回

### L85–L91（catch）
- **类型**：异常捕获 + 500 响应

---

## D. 接口：注册（L99–L322）

核心思路：**先验证 role → 再分 student / merchant 两条流程**。

### L105（拿参数）
- **类型**：对象解构
- **作用**：把两种注册可能用到的字段一次性取出

### L109–L114（role 校验）
- **类型**：条件判断
- **作用**：必须是 `student` 或 `merchant`

### L118–L218（student：学生注册）
固定套路：**校验 → 查重 → hash → insert → sign token → 返回**。

- **L122–L127**：校验 email/username/password
- **L131–L136**：校验邮箱后缀
- **L138–L148**：验证码校验逻辑预留（目前不执行）
- **L150–L155**：密码长度至少 6
- **L159–L169**：查邮箱是否已注册（`query`）
- **L173–L183**：查用户名是否已存在（`query`）
- **L186**：`bcrypt.hash(password, 10)`
  - **类型**：异步函数调用
  - **作用**：生成不可逆 `password_hash`
- **L190–L193**：插入用户到 `users` 表（参数化 SQL，防注入）
- **L196–L204**：`jwt.sign(payload, JWT_SECRET, { expiresIn })`
- **L207–L217**：返回 JSON（`token` + `data`）
  - **联动**：前端会把 `token` 存到 `localStorage`

### L219–L294（merchant：商家注册）
套路相同，但校验变成“邀请码”：
- **L224–L229**：username/password/invite_code 必填
- **L233–L238**：校验 `invite_code === MERCHANT_INVITE_CODE`
- **L241–L246**：密码长度
- **L250–L260**：用户名查重
- **L263**：hash 密码
- **L267–L270**：插入商家用户（只写 username/password_hash/role）
- **L273–L281**：生成 token
- **L284–L293**：返回 JSON

### L296–L321（注册 catch）
- **类型**：异常捕获
- **重点**：`error.code === 'ER_DUP_ENTRY'`
  - **联动**：来自 MySQL 的 UNIQUE 约束（`init-db.sql` 定义）
- **作用**：把“数据库报错”翻译成用户能看懂的提示

---

## E. 接口：登录（L329–L437）

核心套路：**查用户 → compare 密码 → sign token → 返回**。

### L334（拿参数）
- **类型**：对象解构
- **作用**：支持 `username/email/student_id` 三种登录方式
- **联动**：`html/login.js` 目前传的是 `student_id + password`

### L338–L351（基础校验）
- **L338–L343**：password 必填
- **L346–L351**：三种账号字段至少一个

### L355–L379（按提供的字段查询用户）
- **类型**：`if/else` 分支 + `await query(...)`
- **作用**：根据不同字段拼不同 WHERE 条件
- **联动**：查 `users` 表取 `password_hash` 用来对比

### L382–L387（用户不存在）
- **类型**：401 响应
- **作用**：不给攻击者“账号是否存在”的明确提示（安全习惯）

### L393–L400（校验密码）
- **代码**：`bcrypt.compare(password, user.password_hash)`
- **类型**：异步比对
- **作用**：验证明文密码是否匹配 hash

### L403–L413（生成 token）
- **类型**：JWT 签名
- **作用**：把用户信息写进 token（后续鉴权用）

### L416–L427（成功响应）
- **联动**：前端存 token / user 信息

### L429–L436（登录 catch）
- **类型**：异常捕获 + 500

---

## F. 导出 router（L439–L440）

### L440
- **代码**：`module.exports = router;`
- **类型**：CommonJS 导出
- **作用**：让 `server.js` 能 `require('./routes/auth')` 并挂载路由

---

## 最重要的 2 个“你以后写任何业务路由都通用”的套路

- **套路 1（注册类）**：校验 → 查重 → hash → 写库 → 生成 token → 返回
- **套路 2（登录类）**：查用户 → compare 密码 → 生成 token → 返回

