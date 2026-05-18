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
const { logAudit } = require('../services/auditLog');
const { sendVerificationEmail } = require('../services/email');
const { grantExp } = require('../services/expService');
const { attachExp } = require('../utils/expResponse');

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

    // 频率限制：同一邮箱 60 秒内只允许发送一次
    const recentRows = await query(
      'SELECT created_at FROM email_verification_codes WHERE email = ? AND scene = ? ORDER BY created_at DESC LIMIT 1',
      [email, 'register']
    );
    if (recentRows && recentRows[0]) {
      const lastTime = new Date(recentRows[0].created_at);
      const now = new Date();
      if (now.getTime() - lastTime.getTime() < 60 * 1000) {
        return res.status(429).json({
          status: -1,
          message: '发送太频繁，请稍后再试'
        });
      }
    }

    // 每日最大发送次数（简单策略：10 次）
    const dailyRows = await query(
      'SELECT COUNT(*) AS cnt FROM email_verification_codes WHERE email = ? AND scene = ? AND DATE(created_at) = CURDATE()',
      [email, 'register']
    );
    const dailyCount = dailyRows && dailyRows[0] ? Number(dailyRows[0].cnt) : 0;
    if (dailyCount >= 10) {
      return res.status(429).json({
        status: -1,
        message: '当日验证码发送次数已达上限，请明天再试'
      });
    }

    // 生成 6 位数字验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);

    // 有效期 10 分钟
    await query(
      'INSERT INTO email_verification_codes (email, scene, code_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [email, 'register', codeHash]
    );

    // 发送邮件
    await sendVerificationEmail(email, code, 10);

    res.status(200).json({
      status: 0,
      message: '验证码已发送，请查收邮箱',
      ...(process.env.NODE_ENV === 'development' && { verification_code: code })
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
// 忘记密码：发送重置验证码
// ============================================
router.post('/send-reset-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: -1, message: '邮箱不能为空' });
    }
    if (!email.endsWith('@xmu.edu.my')) {
      return res.status(400).json({ status: -1, message: '邮箱必须是 @xmu.edu.my 格式' });
    }

    // 必须是已注册邮箱
    const users = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(400).json({ status: -1, message: '该邮箱未注册' });
    }

    // 频率限制：60 秒
    const recentRows = await query(
      'SELECT created_at FROM email_verification_codes WHERE email = ? AND scene = ? ORDER BY created_at DESC LIMIT 1',
      [email, 'reset_password']
    );
    if (recentRows && recentRows[0]) {
      const lastTime = new Date(recentRows[0].created_at);
      if (Date.now() - lastTime.getTime() < 60 * 1000) {
        return res.status(429).json({ status: -1, message: '发送太频繁，请稍后再试' });
      }
    }

    // 每日上限 10 次
    const dailyRows = await query(
      'SELECT COUNT(*) AS cnt FROM email_verification_codes WHERE email = ? AND scene = ? AND DATE(created_at) = CURDATE()',
      [email, 'reset_password']
    );
    const dailyCount = dailyRows && dailyRows[0] ? Number(dailyRows[0].cnt) : 0;
    if (dailyCount >= 10) {
      return res.status(429).json({ status: -1, message: '当日验证码发送次数已达上限，请明天再试' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    await query(
      'INSERT INTO email_verification_codes (email, scene, code_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [email, 'reset_password', codeHash]
    );

    await sendVerificationEmail(email, code, 10);

    res.status(200).json({
      status: 0,
      message: '重置验证码已发送，请查收邮箱',
      ...(process.env.NODE_ENV === 'development' && { verification_code: code }),
    });
  } catch (error) {
    console.error('发送重置验证码错误:', error);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
  }
});

// ============================================
// 忘记密码：提交验证码 + 新密码
// ============================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, verification_code, new_password } = req.body || {};

    if (!email || !verification_code || !new_password) {
      return res.status(400).json({ status: -1, message: '邮箱、验证码和新密码不能为空' });
    }
    if (!email.endsWith('@xmu.edu.my')) {
      return res.status(400).json({ status: -1, message: '邮箱必须是 @xmu.edu.my 格式' });
    }
    if (String(new_password).length < 6) {
      return res.status(400).json({ status: -1, message: '新密码长度至少为6个字符' });
    }

    const users = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(400).json({ status: -1, message: '该邮箱未注册' });
    }
    const userId = users[0].id;

    const rows = await query(
      `SELECT id, code_hash, expires_at, used_at
       FROM email_verification_codes
       WHERE email = ? AND scene = 'reset_password'
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );
    if (!rows || rows.length === 0) {
      return res.status(400).json({ status: -1, message: '验证码不存在或已过期' });
    }
    const latest = rows[0];
    if (latest.used_at) {
      return res.status(400).json({ status: -1, message: '验证码已被使用，请重新获取' });
    }
    if (new Date(latest.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ status: -1, message: '验证码已过期，请重新获取' });
    }
    const ok = await bcrypt.compare(String(verification_code), latest.code_hash);
    if (!ok) {
      return res.status(400).json({ status: -1, message: '验证码错误' });
    }

    const newHash = await bcrypt.hash(String(new_password), 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    await query('UPDATE email_verification_codes SET used_at = NOW() WHERE id = ?', [latest.id]);

    res.status(200).json({ status: 0, message: '密码重置成功，请使用新密码登录' });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ status: -1, message: '服务器错误，请稍后重试' });
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

      // 3.3 验证邮箱验证码：必须填写且正确、未过期、未使用
      if (!verification_code) {
        return res.status(400).json({
          status: -1,
          message: '请输入邮箱验证码'
        });
      }
      const rows = await query(
        `SELECT id, code_hash, expires_at, used_at
         FROM email_verification_codes
         WHERE email = ? AND scene = 'register'
         ORDER BY created_at DESC
         LIMIT 1`,
        [email]
      );
      if (!rows || rows.length === 0) {
        return res.status(400).json({
          status: -1,
          message: '验证码不存在或已过期'
        });
      }
      const latest = rows[0];
      if (latest.used_at) {
        return res.status(400).json({
          status: -1,
          message: '验证码已被使用，请重新获取'
        });
      }
      if (new Date(latest.expires_at).getTime() <= Date.now()) {
        return res.status(400).json({
          status: -1,
          message: '验证码已过期，请重新获取'
        });
      }
      const ok = await bcrypt.compare(String(verification_code), latest.code_hash);
      if (!ok) {
        return res.status(400).json({
          status: -1,
          message: '验证码错误'
        });
      }

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
        [username, email, password_hash, 'student', 1]
      );

      // 3.8.1 标记验证码已使用
      await query('UPDATE email_verification_codes SET used_at = NOW() WHERE id = ?', [latest.id]);

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
      //======================================================================================================================
      // ========================================================== 商家注册验证 ===============================================

      //=========== 3.1 验证必要字段=========
      // 修改时间: 2025-01-26
      if (!username || !password || !invite_code) {
        return res.status(400).json({
          status: -1,
          message: '用户名、密码和邀请码不能为空'
        });
      }

      //========= 3.2 验证邀请码===========
      // 修改时间: 2025-01-26
      if (invite_code !== MERCHANT_INVITE_CODE) {
        return res.status(400).json({
          status: -1,
          message: '邀请码错误'
        });
      }

      // =======3.3 验证密码强度===============
      if (password.length < 6) {
        return res.status(400).json({
          status: -1,
          message: '密码长度至少为6个字符'
        });
      }

      // ================3.4 检查用户名是否已存在=========
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

      //============= 3.5 加密密码==========
      const password_hash = await bcrypt.hash(password, 10);

      // 3.6 保存用户信息到数据库（商家）
      // 修改时间: 2025-01-26
      const result = await query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, password_hash, 'merchant']
      );

      //========= 3.7 生成 JWT 令牌==============
      const token = jwt.sign(
        {
          id: result.insertId,
          username: username,
          role: 'merchant'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      //========== 3.8 返回成功响应===============
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
//=============================================================================================
//=============================================================================================

// ============================================
// 用户登录路由
// ============================================
// 学生仅支持邮箱登录；商家支持用户名登录。即：email 或 username（其一）+ 密码
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: -1,
        message: '密码不能为空'
      });
    }

    const hasEmail = email != null && String(email).trim() !== '';
    const hasUsername = username != null && String(username).trim() !== '';
    if (!hasEmail && !hasUsername) {
      return res.status(400).json({
        status: -1,
        message: '请输入邮箱或商家用户名'
      });
    }

    let users;
    if (hasEmail) {
      users = await query(
        'SELECT id, student_id, username, email, password_hash, role FROM users WHERE email = ?',
        [String(email).trim()]
      );
    } else {
      users = await query(
        'SELECT id, student_id, username, email, password_hash, role FROM users WHERE username = ?',
        [String(username).trim()]
      );
    }

    if (!users || users.length === 0) {
      return res.status(401).json({
        status: -1,
        message:
          '该邮箱或用户名尚未注册，请先注册；若已注册请核对账号是否输入正确。 / This email or username is not registered. Please sign up first.'
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: -1,
        message: '密码不正确，请重试或使用「重置密码」。 / Incorrect password. Try again or use Reset password.'
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

    // 写审计日志 + 控制台日志
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    console.log('[AUDIT][LOGIN_SUCCESS]', {
      userId: user.id,
      role: user.role,
      ip,
      email: email || null,
      username: username || null,
    });
    logAudit({
      userId: user.id,
      role: user.role,
      action: 'LOGIN',
      targetType: 'user',
      targetId: user.id,
      ip,
      userAgent: ua,
      meta: { email: email || null, username: username || null },
    });

    const expResult = await grantExp(user.id, { action: 'login' });

    // 7. 返回成功响应
    res.status(200).json(attachExp({
      status: 0,
      message: '登录成功！',
      token: token,
      data: {
        id: user.id,
        student_id: user.student_id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    }, expResult));

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

