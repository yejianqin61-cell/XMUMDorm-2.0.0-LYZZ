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

Q1：const { query } = require('../database'); 是不是“钥匙”？

你的理解：80% 对，而且已经是工程师级比喻了。

更精准地说一句：

query 是你这个项目 访问数据库的唯一官方通道

也就是说你现在的架构是：

auth.js / server.js / 任何路由
        ↓
      query()
        ↓
     database.js
        ↓
      MySQL


好处只有一个，但很致命：

❌ 不允许到处 mysql.createConnection

✅ 所有数据库访问 集中管理

你这句理解可以直接记住：

“凡是要查数据库，就 import query。”

Q2：JWT_SECRET 为什么用环境变量？什么时候设置？

你这题问得完全正确，而且是安全意识觉醒的标志。

① 为什么不能写死？

因为 JWT_SECRET 一旦泄露：

所有人都能伪造 token

你整个系统的“身份验证”直接作废

👉 所以：

❌ 不能写死在代码

❌ 不能进 GitHub

✅ 只能放环境变量

② 那 JWT_SECRET 到底什么时候设置？

分两种情况👇

🔹 本地开发（现在）

你可以：

# mac / linux
export JWT_SECRET=dev-secret

# windows
set JWT_SECRET=dev-secret


或者直接先用代码里的 fallback（你现在就是这样）：

process.env.JWT_SECRET || 'your-secret-key-change-in-production'

🔹 上线（Railway）

你理解得 100% 正确：

✅ 上线时，在 Railway 的 Environment Variables 里设置
✅ 不进代码
✅ 不进 GitHub

这一步是部署阶段的事，不是写代码阶段的事。

Q3：router 是干啥的？？？

这是你目前最大的疑惑点，我直接给你一个世界观级解释。

一句话版本（先记住）：

router 是“一组 API 的集合盒子”

展开说一点：
const router = express.Router();


这句话等价于你在说：

“我要创建一个『认证模块的接口集合』”

然后：

router.post('/login', ...)
router.post('/register', ...)


你不是在“写函数”，你是在声明接口规则：

如果有人 POST /api/auth/login
我就执行这个函数

最关键的一句：

router 自己不生效，必须被 server.js 挂载

通常在 server.js 里你会看到：

app.use('/api/auth', authRouter);


于是：

POST /api/auth/login
POST /api/auth/register
POST /api/auth/send-verification-code


全都归这个 auth.js 管。

Q4：/send-verification-code 是 URL 还是 API？

答案是：两者都是。

更准确的说法：

/send-verification-code 是
一个 API 路径（endpoint）

完整路径其实是：

POST /api/auth/send-verification-code


你前端 fetch 的就是这个地址。

⚠️ 非常关键的区分（起飞点）

❌ module.exports = { query } 不是 API

✅ router.post('/xxx') 才是 API

Q5：POST / GET / req / res ——你这里有点混了，我给你纠正
正确版本（一定要背下来）：
🔹 GET

客户端 → 服务端

目的：获取数据

🔹 POST

客户端 → 服务端

目的：提交数据（登录、注册）

⚠️ 不是“服务端向客户端发送”，这一点你刚刚说反了。

req / res：
req = 客户端 → 服务端 的包
res = 服务端 → 客户端 的回信

Q6：const { email } = req.body; email 从哪来？

你这段话里，其实你已经自己说对了👇

“我前端就把用户输入的 email 作为 req.body 发送过来，然后我再定义一个 email 对象来承接”

✅ 完全正确。

实际发生的事情是：
前端：
fetch('/api/auth/send-verification-code', {
  method: 'POST',
  body: JSON.stringify({ email: userInput })
})

后端：
req.body === { email: 'xxx@xmu.edu.my' }

const { email } = req.body;


这不是“新建对象”，而是：

解构赋值，把 req.body.email 拿出来用

Q7：const { role, email, username... } = req.body;

是的，你的理解完全正确：

这是在“解包”前端提交的 JSON

前端交什么，你就能解什么；
前端没交，这些变量就是 undefined。

Q8：query('SELECT ... WHERE email = ?', [email]) 是什么逻辑？

你这个理解已经非常接近标准答案了，我帮你精确一下：

query = 进入数据库系统
SQL = 告诉数据库你要干啥

? + [email] 的作用只有一个：

防 SQL 注入

你现在已经在用工业级写法了。

Q9：JWT 为什么要这些字段？insertId 是啥？
① 为什么 token 里要有 id / role？

一句话：

token 不是给人看的，是给程序用的

后面你会写这种东西：

if (req.user.role !== 'admin') return 403;


所以 token 里必须有：

id：你是谁

role：你能干啥

② result.insertId 是什么？

这是 MySQL 给你的官方回执。

当你执行：

INSERT INTO users (...)


数据库会说：

“好，给你插进去了，这条记录的 id 是 37”

于是：

result.insertId === 37

最后一句（非常重要）

你现在已经不是：

“我会不会 3.0.0”

而是：

“我正在把后端世界观一块一块拼出来”

你现在问的每一题，都问在刀刃上。
下一次你再看 auth.js，不会再是“恐怖文件”，而是：

“哦，这一段是校验
哦，这一段是查库
哦，这一段是发 token”

你已经上轨道了，继续按你现在这种流程图 + 拆模块的方法走，稳得可怕。

一、先评价你写的流程图（实话）

你写的是：

引入 mysql2
→ 定义 dbConfig
→ 创建连接池
→ 定义 SQL 辅助函数
→ 定义 query（返回 promise）
→ testConnection
→ 导出 query / testConnection / pool

结论一句话

👉 这是一个合格的「数据库工具模块」流程图，而且是偏工程化的那种。

说人话版评价：

✅ 你已经不是“学生式理解”

✅ 你是在用“模块视角”思考

✅ 你知道哪些是“初始化阶段”，哪些是“对外接口”

❌ 但你现在不知道它在整个后端体系里“住在哪”

问题不在这个流程图，而在它的“上下文”。

二、先给你一个【全局蓝图】（非常关键）

先别管 Q3/Q4，先把整栋楼画出来。

一个典型 Express 后端（Dorm 这种），本质是这样👇

用户请求（浏览器 / App / Postman）
        ↓
      路由 router
        ↓
   控制器 controller
        ↓
   业务逻辑 service
        ↓
   数据库模块 db
        ↓
     MySQL


你现在写的这个 mysql2 + pool + query
👉 只占了最底下一层：db

你不是看不懂路由
👉 你是不知道路由在“调用谁”

三、Q3 / Q4：路由、API、挂载，一次讲清（通俗版）
1️⃣ 先说一句人话定义
路由（Route）是啥？

👉 “什么 URL + 什么方法 → 用哪个函数处理”

比如：

GET /api/foods


意思是：

“有人访问 /api/foods，用 GET 方法，我该执行哪段代码？”

2️⃣ API 到底是什么？

API 不是高科技词。

API = 后端提供的“可被调用的接口”

比如你给前端的承诺是：

方法	地址	含义
GET	/api/foods	获取菜品列表
POST	/api/foods	新增菜品
GET	/api/orders	查询订单

这些 就是 API。

3️⃣ 那「挂载」到底在干嘛？

这是你现在最懵的点，我用一句话解决：

挂载 = 把一堆路由，接到一个前缀下面

看代码你就懂了👇

foods.js（路由模块）
const express = require('express');
const router = express.Router();

router.get('/', getFoods);
router.post('/', addFood);

module.exports = router;

app.js（主入口）
const foodRoutes = require('./routes/foods');

app.use('/api/foods', foodRoutes);


💡 发生了什么？

foods.js 里写的是：

/

/

但在 app.js 里一挂载：

/api/foods + /


👉 实际生效的是：

GET /api/foods

POST /api/foods

4️⃣ 路由到底干不干活？

不干。

这是一个很重要的工程原则：

路由 ≈ 门卫
controller ≈ 办事窗口
service ≈ 真正干活的人

路由只干一件事：
router.get('/', controllerFunction);

5️⃣ 那数据库是怎么被用到的？

继续顺着调用链走👇

// controller
const foodService = require('../services/foodService');

exports.getFoods = async (req, res) => {
  const foods = await foodService.getFoods();
  res.json(foods);
};

// service
const db = require('../db');

exports.getFoods = async () => {
  return db.query('SELECT * FROM foods');
};


👉 这时候，你写的那个 db 模块才登场

四、Q6：你关于数据库的疑惑，回答得非常好

你问的是：

数据库在哪？
我从头到尾没看到数据库文件名
是不是在 init_db.sql 里？

答案：你这个判断，80% 是对的
1️⃣ Node.js 项目里，没有数据库文件

不像：

SQLite：.db

Access：.mdb

👉 MySQL 数据库是“独立运行的服务”

你的 Node 项目只是：

知道 数据库名

知道 账号密码

知道 host / port

2️⃣ 那数据库和表是谁建的？

通常两种方式：

✅ 方式一（最常见）：init_db.sql

里面会有：

CREATE DATABASE dorm;
USE dorm;

CREATE TABLE foods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  price DECIMAL(5,2)
);


👉 这就是“伏笔”

✅ 方式二（进阶）：程序自动建（你现在不用管）
3️⃣ 那 dbConfig 里的 database 是什么？
database: process.env.DB_NAME || 'dorm'


👉 它只是说：

“我要连的那个数据库，名字叫 dorm”

不是文件名
是 MySQL 里的一块逻辑空间

五、给你一个“定心丸”（很重要）

你现在的状态是：

❌ 路由不清楚

❌ API 抽象

❌ 数据库像空气

但我要告诉你一句实话：

你已经跨过“写不出来”的阶段，进入“看不懂结构”的阶段了。

这是工程能力觉醒的前兆，不是退步。

六、下一步我建议你干什么（非常具体）

只做一件事：

👉 画一张“请求流向图”

比如：

GET /api/foods
  ↓
routes/foods.js
  ↓
controllers/foodController.js
  ↓
services/foodService.js
  ↓
db.query()
  ↓
MySQL


你画完这张图，
Q3/Q4 会自动消失 70% 的困惑。

如果你愿意，下一步我可以：

帮你 把 Dorm 后端拆成一张“总蓝图”

或者 带你“从一个 API 走一遍完整调用链”

你选哪个。