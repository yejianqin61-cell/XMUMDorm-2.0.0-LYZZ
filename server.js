/**
 * ============================================
 * Jack 校园社交网站 - 后端服务器入口文件
 * ============================================
 * 
 * 这个文件是整个后端服务的入口点，就像前端的 index.html 一样
 */

// 1. 引入 Express 框架
const express = require('express');

// 2. 引入 CORS 中间件
const cors = require('cors');

// 3. HTTP 头安全加固（Helmet）
const helmet = require('helmet');

// 4. Rate Limit 防刷中间件
const rateLimit = require('express-rate-limit');

// 5. 引入环境变量配置
require('dotenv').config();

// 当前是否生产环境
const IS_PROD = process.env.NODE_ENV === 'production';

// 6. 引入数据库连接
// 创建时间: 2025-01-26
// 在服务器启动时测试数据库连接
const { testConnection } = require('./database');

// 7. 引入路由文件
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const canteenRoutes = require('./routes/canteen');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const scheduleRoutes = require('./routes/schedule');
const diaryRoutes = require('./routes/diary');
const pushRoutes = require('./routes/push');

// 8. 创建一个 Express 应用实例
const app = express();

// 如果部署在 Vercel / Railway 等反向代理之后，需要开启 trust proxy
// 否则 express-rate-limit 在看到 X-Forwarded-For 头时会报错
app.set('trust proxy', 1);

// 9. 定义服务器端口
const PORT = process.env.PORT || 4040;

// ============================================
// 中间件配置（Middleware）
// ============================================

// 8. 使用 CORS 中间件
app.use(cors());

// 8.5 使用 Helmet 设置常见安全响应头
app.use(helmet());

// 9. 使用 JSON 解析中间件，并限制单次请求体大小，防止大包 DoS
app.use(express.json({ limit: '1mb' }));

// 10. 使用 URL 编码解析中间件，同样限制大小
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 10.2 全局 Rate Limit（防止接口被暴力刷）
// 开发环境不限流；生产环境放宽额度（当前用户量小、并发低，避免校园 NAT 共 IP 误伤）
const apiLimiter = IS_PROD
  ? rateLimit({
      windowMs: 15 * 60 * 1000, // 15 分钟
      max: 2500, // 同一 IP 每窗口内 /api 请求上限（原 100，易在共用出口 IP 下误触）
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: -1,
        message: '请求过于频繁，请稍后再试'
      }
    })
  : (req, res, next) => next();

// 登录 / 注册额外再加一层限流（仍严于全站，但放宽避免 NAT 下正常用户被挡）
const authLimiter = IS_PROD
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 150,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: -1,
        message: '登录/注册请求过于频繁，请稍后再试'
      }
    })
  : (req, res, next) => next();

// 10.1 上传文件静态服务（2.0.0）
const path = require('path');
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// 10.2 静态资源 public（默认图等，随代码部署，不写 .gitignore）
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// 10.3 将 Rate Limit 应用于所有 /api 开头的接口
app.use('/api', apiLimiter);

// ============================================
// 路由配置（Routes）
// ============================================

// 11. 根路由 - 测试服务器是否运行
app.get('/', (req, res) => {
  res.json({
    message: 'Jack 校园社交网站后端服务运行正常！',
    version: '1.0.0'
  });
});

// 健康检查（供 Railway 等平台探测存活，避免误判为崩溃）
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

// 12. API 路由前缀
// 为认证接口单独挂载更严格的限流中间件
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/canteen', canteenRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/push', pushRoutes);

// ============================================
// 错误处理中间件
// ============================================

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({
    status: -1,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// 启动服务器
// ============================================

// 13. 监听指定端口，启动服务器
// 创建时间: 2025-01-26
// 修改: 添加数据库连接测试、排行榜每周一东八区重置
app.listen(PORT, async () => {
  console.log(`========================================`);
  console.log(`🚀 服务器已启动！`);
  console.log(`📍 地址: http://127.0.0.1:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  
  // 测试数据库连接
  await testConnection();

  // 排行榜：每周一 0 点东八区重置店铺/用户当周点评数
  try {
    const { resetWeeklyCounts } = require('./services/rankingStats');
    const { isMondayZeroInShanghai, nowInShanghai, shanghaiDateString } = require('./utils/timezone');
    let lastResetWeek = '';
    setInterval(async () => {
      if (!isMondayZeroInShanghai()) return;
      const sh = nowInShanghai();
      const weekKey = `${sh.getFullYear()}-${String(sh.getMonth() + 1).padStart(2, '0')}-${String(sh.getDate()).padStart(2, '0')}`;
      if (lastResetWeek === weekKey) return;
      lastResetWeek = weekKey;
      await resetWeeklyCounts();
      console.log(`[排行榜] 东八区周一 0 点已重置当周点评数 ${shanghaiDateString()}`);
    }, 60 * 1000);
  } catch (e) {
    console.warn('排行榜每周重置未启动:', e.message);
  }

  // Web Push：课前约 30 分钟提醒（吉隆坡时间，依赖 CLASS_REMINDER_WEEK 与课表）
  try {
    const { runClassReminderTick } = require('./services/classReminderPush');
    setInterval(() => {
      runClassReminderTick().catch((e) => console.warn('[class-reminder]', e.message || e));
    }, 60 * 1000);
    runClassReminderTick().catch(() => {});
  } catch (e) {
    console.warn('上课提醒任务未启动:', e.message);
  }

  console.log(`========================================`);
});

