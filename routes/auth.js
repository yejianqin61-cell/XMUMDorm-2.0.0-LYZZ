/**
 * ============================================
 * 认证相关路由文件
 * ============================================
 * 
 * 这个文件处理所有与用户认证相关的请求：
 * - 用户注册（商家/非商家）
 * - 用户登录
 * - 邮箱验证码发送（接口预留）
 * 
 * 修改时间: 2025-01-26
 * 最新修改: 2025-01-26 - 支持商家/非商家注册，添加邮箱验证码接口
 */

// 引入 Express 的 Router 对象
const express = require('express');
const router = express.Router();

// 引入密码加密库
const bcrypt = require('bcryptjs');

// 引入 JWT 库
const jwt = require('jsonwebtoken');

// 引入数据库查询函数
const { query } = require('../database');

// 从环境变量获取 JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// JWT 令牌有效期（7天）
const JWT_EXPIRES_IN = '7d';

// 商家注册邀请码
// 修改时间: 2025-01-26
const MERCHANT_INVITE_CODE = 'yejianqinnb';

// ============================================
// 发送邮箱验证码接口（预留）
// ============================================
// 创建时间: 2025-01-26
// 功能: 发送邮箱验证码到指定邮箱（@xmu.edu.my）
// 状态: 接口已预留，功能待实现
router.post('/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;

    // 验证邮箱格式
    // 修改时间: 2025-01-26
    if (!email) {
      return res.status(400).json({
        status: -1,
        message: '邮箱不能为空'
      });
    }

    // 验证邮箱后缀必须是 @xmu.edu.my
    // 修改时间: 2025-01-26
    if (!email.endsWith('@xmu.edu.my')) {
      return res.status(400).json({
        status: -1,
        message: '邮箱必须是 @xmu.edu.my 格式'
      });
    }

    // TODO: 实现邮箱验证码发送功能
    // 修改时间: 2025-01-26
    // 这里需要：
    // 1. 生成6位随机验证码
    // 2. 将验证码存储到数据库或缓存（设置过期时间，如5分钟）
    // 3. 发送邮件到指定邮箱
    // 4. 返回成功响应

    // 暂时返回成功（功能待实现）
    // 修改时间: 2025-01-26
    res.status(200).json({
      status: 0,
      message: '验证码已发送（功能待实现）',
      // 开发阶段可以返回验证码用于测试
      // 生产环境必须删除此字段
      ...(process.env.NODE_ENV === 'development' && {
        verification_code: '123456' // 临时测试用
      })
    });

  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// ============================================
// 用户注册路由
// ============================================
// 修改时间: 2025-01-26
// 最新修改: 2025-01-26 - 支持商家/非商家两种注册方式
router.post('/register', async (req, res) => {
  try {
    // 1. 从请求体中获取用户提交的数据
    // 修改时间: 2025-01-26
    // 非商家: { role: 'student', email, username, password, verification_code }
    // 商家: { role: 'merchant', username, password, invite_code }
    const { role, email, username, password, verification_code, invite_code } = req.body;

    // 2. 验证角色
    // 修改时间: 2025-01-26
    if (!role || (role !== 'student' && role !== 'merchant')) {
      return res.status(400).json({
        status: -1,
        message: '请选择注册类型（学生或商家）'
      });
    }

    // 3. 根据角色进行不同的验证
    // 修改时间: 2025-01-26
    if (role === 'student') {
      // ========== 非商家（学生）注册验证 ==========

      // 3.1 验证必要字段
      if (!email || !username || !password) {
        return res.status(400).json({
          status: -1,
          message: '邮箱、用户名和密码不能为空'
        });
      }

      // 3.2 验证邮箱格式（必须是 @xmu.edu.my）
      // 修改时间: 2025-01-26
      if (!email.endsWith('@xmu.edu.my')) {
        return res.status(400).json({
          status: -1,
          message: '邮箱必须是 @xmu.edu.my 格式'
        });
      }

      // 3.3 验证邮箱验证码（接口预留，暂时不验证）
      // 修改时间: 2025-01-26
      // TODO: 实现验证码验证逻辑
      // if (!verification_code) {
      //   return res.status(400).json({
      //     status: -1,
      //     message: '请输入邮箱验证码'
      //   });
      // }
      // TODO: 验证验证码是否正确和是否过期

      // 3.4 验证密码强度
      if (password.length < 6) {
        return res.status(400).json({
          status: -1,
          message: '密码长度至少为6个字符'
        });
      }

      // 3.5 检查邮箱是否已注册
      // 修改时间: 2025-01-26
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingEmail.length > 0) {
        return res.status(400).json({
          status: -1,
          message: '该邮箱已被注册'
        });
      }

      // 3.6 检查用户名是否已存在
      // 修改时间: 2025-01-26
      const existingUsername = await query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUsername.length > 0) {
        return res.status(400).json({
          status: -1,
          message: '该用户名已被使用'
        });
      }

      // 3.7 加密密码
      const password_hash = await bcrypt.hash(password, 10);

      // 3.8 保存用户信息到数据库（非商家）
      // 修改时间: 2025-01-26
      const result = await query(
        'INSERT INTO users (username, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)',
        [username, email, password_hash, 'student', 0] // email_verified 暂时设为 0，待实现验证功能后改为 1
      );

      // 3.9 生成 JWT 令牌
      const token = jwt.sign(
        {
          id: result.insertId,
          email: email,
          role: 'student'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // 3.10 返回成功响应
      res.status(200).json({
        status: 0,
        message: '注册成功！',
        token: token,
        data: {
          id: result.insertId,
          username: username,
          email: email,
          role: 'student'
        }
      });

    } else if (role === 'merchant') {
      // ========== 商家注册验证 ==========

      // 3.1 验证必要字段
      // 修改时间: 2025-01-26
      if (!username || !password || !invite_code) {
        return res.status(400).json({
          status: -1,
          message: '用户名、密码和邀请码不能为空'
        });
      }

      // 3.2 验证邀请码
      // 修改时间: 2025-01-26
      if (invite_code !== MERCHANT_INVITE_CODE) {
        return res.status(400).json({
          status: -1,
          message: '邀请码错误'
        });
      }

      // 3.3 验证密码强度
      if (password.length < 6) {
        return res.status(400).json({
          status: -1,
          message: '密码长度至少为6个字符'
        });
      }

      // 3.4 检查用户名是否已存在
      // 修改时间: 2025-01-26
      const existingUsername = await query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUsername.length > 0) {
        return res.status(400).json({
          status: -1,
          message: '该用户名已被使用'
        });
      }

      // 3.5 加密密码
      const password_hash = await bcrypt.hash(password, 10);

      // 3.6 保存用户信息到数据库（商家）
      // 修改时间: 2025-01-26
      const result = await query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, password_hash, 'merchant']
      );

      // 3.7 生成 JWT 令牌
      const token = jwt.sign(
        {
          id: result.insertId,
          username: username,
          role: 'merchant'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // 3.8 返回成功响应
      res.status(200).json({
        status: 0,
        message: '注册成功！',
        token: token,
        data: {
          id: result.insertId,
          username: username,
          role: 'merchant'
        }
      });
    }

  } catch (error) {
    // 错误处理
    console.error('注册错误:', error);

    // 如果是数据库唯一约束错误，返回友好提示
    // 修改时间: 2025-01-26
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('email')) {
        return res.status(400).json({
          status: -1,
          message: '该邮箱已被注册'
        });
      } else if (error.message.includes('username')) {
        return res.status(400).json({
          status: -1,
          message: '该用户名已被使用'
        });
      }
    }

    // 其他错误返回通用错误信息
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// ============================================
// 用户登录路由
// ============================================
// 2.0.0：仅支持学号或邮箱 + 密码，不再支持用户名登录
router.post('/login', async (req, res) => {
  try {
    const { email, student_id, password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: -1,
        message: '密码不能为空'
      });
    }

    // 至少提供学号或邮箱其一
    if (!email && !student_id) {
      return res.status(400).json({
        status: -1,
        message: '请输入学号或邮箱'
      });
    }

    let users;
    if (student_id) {
      users = await query(
        'SELECT id, student_id, username, email, password_hash, role FROM users WHERE student_id = ?',
        [student_id]
      );
    } else {
      users = await query(
        'SELECT id, student_id, username, email, password_hash, role FROM users WHERE email = ?',
        [email]
      );
    }

    if (users.length === 0) {
      return res.status(401).json({
        status: -1,
        message: '学号/邮箱或密码错误'
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: -1,
        message: '学号/邮箱或密码错误'
      });
    }

    // 6. 生成 JWT 令牌
    const token = jwt.sign(
      {
        id: user.id,
        student_id: user.student_id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 7. 返回成功响应
    res.status(200).json({
      status: 0,
      message: '登录成功！',
      token: token,
      data: {
        id: user.id,
        student_id: user.student_id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    // 错误处理
    console.error('登录错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// 导出路由对象
module.exports = router;

