# Jack 校园社交网站

一个功能完整的校园社交网站，包含社交功能和食堂系统。

## 项目结构

```
Jack/
├── html/              # 前端文件
│   ├── login.html     # 登录页面
│   ├── login.js       # 登录逻辑
│   ├── login.css      # 登录样式
│   ├── register.html  # 注册页面
│   ├── register.js    # 注册逻辑
│   ├── register.css   # 注册样式
│   └── config.js      # API配置
├── routes/            # 后端路由
│   ├── auth.js        # 认证路由（登录、注册）
│   ├── posts.js       # 帖子路由
│   └── canteen.js     # 食堂路由
├── middleware/        # 中间件
│   └── auth.js        # JWT验证中间件
├── database.js        # 数据库连接配置
├── init-db.sql        # 数据库初始化脚本
├── server.js          # 服务器入口文件
├── package.json       # 项目配置文件
└── README.md          # 说明文档
```

## 技术栈

- **前端**: HTML, CSS, JavaScript (原生)
- **后端**: Node.js, Express
- **数据库**: MySQL
- **身份验证**: JWT (JSON Web Token)
- **密码加密**: bcryptjs

## 安装步骤

### 1. 安装 Node.js

如果你还没有安装 Node.js，请访问 [Node.js官网](https://nodejs.org/) 下载并安装。

安装完成后，在终端运行以下命令检查是否安装成功：

```bash
node --version
npm --version
```

### 2. 安装项目依赖

在项目根目录下运行：

```bash
npm install
```

这个命令会读取 `package.json` 文件，自动安装所有需要的依赖包（如 Express、CORS 等）。

### 3. 配置 MySQL 数据库

首先确保已安装并启动 MySQL 服务，然后执行数据库初始化脚本：

```bash
# 在 MySQL 客户端执行，或使用命令行：
mysql -u root -p < init-db.sql
```

这将创建 `jack_campus` 数据库和 `users` 表。

### 4. 创建环境变量文件

创建 `.env` 文件，配置以下内容：

```
PORT=4040
NODE_ENV=development
JWT_SECRET=your-secret-key-here-change-this-in-production

# MySQL 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=jack_campus
```

**重要**: 
- `JWT_SECRET` 应该是一个随机字符串，可以使用以下命令生成：
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- 根据你的 MySQL 配置修改数据库连接信息

### 5. 启动服务器

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务器启动后，你会看到：
```
========================================
🚀 服务器已启动！
📍 地址: http://127.0.0.1:4040
🌍 环境: development
========================================
```

### 6. 测试服务器

在浏览器中访问 `http://127.0.0.1:4040/`，应该看到：
```json
{
  "message": "Jack 校园社交网站后端服务运行正常！",
  "version": "1.0.0"
}
```

## API 接口说明

### 认证相关 (`/api/auth`)

- `POST /api/auth/register` - 用户注册（支持商家/非商家）
- `POST /api/auth/login` - 用户登录（支持用户名/邮箱/学号）
- `POST /api/auth/send-verification-code` - 发送邮箱验证码（接口预留）

### 帖子相关 (`/api/posts`)

- `POST /api/posts` - 发布帖子
- `GET /api/posts` - 获取帖子列表
- `POST /api/posts/:id/like` - 点赞帖子
- `POST /api/posts/:id/comments` - 评论帖子

### 食堂相关 (`/api/canteen`)

- `POST /api/canteen/dishes` - 商家发布菜品
- `GET /api/canteen/dishes` - 获取菜品列表
- `POST /api/canteen/reviews` - 学生发布买家秀
- `GET /api/canteen/ranking` - 获取排行榜

## 开发计划

- [x] 后端项目结构搭建
- [x] 基础 Express 服务器
- [x] 数据库设计和实现（MySQL）
- [x] 用户注册和登录功能（完整实现）
- [x] JWT 身份验证中间件
- [x] 注册页面（支持商家/非商家）
- [ ] 帖子功能（发布、点赞、评论）
- [ ] 食堂系统（商家端、学生端）
- [ ] 排行榜功能

## 已完成功能

### 认证模块（Auth Module）

✅ **用户注册**
- 支持商家/非商家两种注册方式
- 非商家：邮箱（@xmu.edu.my）、用户名、密码、验证码
- 商家：用户名、密码、邀请码（yejianqinnb）
- 学号唯一性验证
- 密码加密存储（bcryptjs）
- 数据验证（邮箱格式、密码强度）
- JWT 令牌生成

✅ **用户登录**
- 支持用户名/邮箱/学号登录
- 密码验证
- JWT 令牌生成
- 用户信息返回

✅ **前端页面**
- 登录页面（login.html）
- 注册页面（register.html）- 支持角色切换
- API 路径已修正

## 文件说明

### 新增文件

- `database.js` - MySQL 数据库连接配置
- `init-db.sql` - 数据库初始化脚本
- `middleware/auth.js` - JWT 身份验证中间件
- `html/register.html` - 注册页面
- `html/register.js` - 注册逻辑
- `html/register.css` - 注册页面样式

### 修改文件

- `package.json` - 添加 mysql2，移除 sqlite3
- `routes/auth.js` - 完整实现注册和登录功能
- `server.js` - 添加数据库连接测试
- `html/login.js` - 修正 API 路径为 `/api/auth/login`

## 注意事项

1. ✅ 认证模块已完整实现，包含数据库操作、密码加密、JWT 生成
2. ✅ 所有新增代码都包含时间戳注释（2025-01-26）
3. ⚠️ 确保 MySQL 服务已启动并正确配置
4. ⚠️ 生产环境必须修改 `JWT_SECRET` 为安全的随机字符串
5. ⚠️ 邮箱验证码功能接口已预留，但发送功能待实现

