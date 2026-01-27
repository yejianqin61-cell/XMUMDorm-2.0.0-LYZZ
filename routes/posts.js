/**
 * ============================================
 * 帖子相关路由文件
 * ============================================
 * 
 * 这个文件处理所有与帖子相关的请求：
 * - 发布帖子
 * - 获取帖子列表
 * - 点赞帖子
 * - 评论帖子
 */

const express = require('express');
const router = express.Router();

// ============================================
// 发布帖子路由
// ============================================
router.post('/', async (req, res) => {
  try {
    const { title, content, images } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        status: -1,
        message: '标题和内容不能为空'
      });
    }
    
    // 暂时返回成功信息（数据库部分稍后添加）
    res.status(200).json({
      status: 0,
      message: '发布成功！',
      data: {
        id: Date.now(),
        title: title,
        content: content,
        images: images || [],
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('发布帖子错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// ============================================
// 获取帖子列表路由
// ============================================
router.get('/', async (req, res) => {
  try {
    // 暂时返回空列表（数据库部分稍后添加）
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: []
    });
    
  } catch (error) {
    console.error('获取帖子列表错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// ============================================
// 点赞帖子路由
// ============================================
router.post('/:id/like', async (req, res) => {
  try {
    const postId = req.params.id; // 从 URL 中获取帖子 ID
    
    // 暂时返回成功信息
    res.status(200).json({
      status: 0,
      message: '点赞成功！',
      data: {
        post_id: postId,
        liked: true
      }
    });
    
  } catch (error) {
    console.error('点赞错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// ============================================
// 评论帖子路由
// ============================================
router.post('/:id/comments', async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        status: -1,
        message: '评论内容不能为空'
      });
    }
    
    // 暂时返回成功信息
    res.status(200).json({
      status: 0,
      message: '评论成功！',
      data: {
        id: Date.now(),
        post_id: postId,
        content: content,
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('评论错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

module.exports = router;

