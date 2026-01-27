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

// 3. 引入环境变量配置
require('dotenv').config();

// 4. 引入数据库连接
// 创建时间: 2025-01-26
// 在服务器启动时测试数据库连接
const { testConnection } = require('./database');

// 5. 引入路由文件
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const canteenRoutes = require('./routes/canteen');

// 6. 创建一个 Express 应用实例
const app = express();

// 7. 定义服务器端口
const PORT = process.env.PORT || 4040;

// ============================================
// 中间件配置（Middleware）
// ============================================

// 8. 使用 CORS 中间件
app.use(cors());

// 9. 使用 JSON 解析中间件
app.use(express.json());

// 10. 使用 URL 编码解析中间件
app.use(express.urlencoded({ extended: true }));

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

// 12. API 路由前缀
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/canteen', canteenRoutes);

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
// 修改: 添加数据库连接测试
app.listen(PORT, async () => {
  console.log(`========================================`);
  console.log(`🚀 服务器已启动！`);
  console.log(`📍 地址: http://127.0.0.1:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  
  // 测试数据库连接
  // 创建时间: 2025-01-26
  await testConnection();
  
  console.log(`========================================`);
});

