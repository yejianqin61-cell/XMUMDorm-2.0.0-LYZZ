/**
 * ============================================
 * 数据库连接配置文件
 * ============================================
 * 创建时间: 2025-01-26
 * 功能: MySQL 数据库连接池配置
 */

// 引入 MySQL2 模块
const mysql = require('mysql2/promise');

// 从环境变量获取数据库配置
// Railway 等平台可能提供单连接串：DATABASE_URL 或 MYSQL_URL（格式：mysql://user:pass@host:port/database）
const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const poolOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};
const dbConfig = connectionUrl
  ? poolOptions
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jack_campus',
      ...poolOptions
    };

// 创建数据库连接池（mysql2 支持连接串或配置对象）
const pool = connectionUrl ? mysql.createPool(connectionUrl, poolOptions) : mysql.createPool(dbConfig);

/**
 * 执行 SQL 查询的辅助函数
 * @param {string} sql - SQL 查询语句
 * @param {Array} params - SQL 参数（用于防止 SQL 注入）
 * @returns {Promise} 查询结果
 */
async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    await query('SELECT 1');
    console.log('✅ 数据库连接成功！');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 导出连接池和查询函数
module.exports = {
  pool,
  query,
  testConnection
};

