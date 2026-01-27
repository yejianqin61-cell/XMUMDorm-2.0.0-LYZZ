/**
 * ============================================
 * 食堂相关路由文件
 * ============================================
 * 
 * 这个文件处理所有与食堂相关的请求：
 * - 商家发布菜品
 * - 学生查看菜品
 * - 学生发布买家秀
 * - 学生评论和打分
 * - 排行榜
 */

const express = require('express');
const router = express.Router();

// ============================================
// 商家发布菜品路由
// ============================================
router.post('/dishes', async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({
        status: -1,
        message: '菜品名称和价格不能为空'
      });
    }
    
    // 暂时返回成功信息
    res.status(200).json({
      status: 0,
      message: '发布菜品成功！',
      data: {
        id: Date.now(),
        name: name,
        description: description || '',
        price: price,
        image: image || '',
        category: category || '其他',
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('发布菜品错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// ============================================
// 获取菜品列表路由
// ============================================
router.get('/dishes', async (req, res) => {
  try {
    // 暂时返回空列表
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: []
    });
    
  } catch (error) {
    console.error('获取菜品列表错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// ============================================
// 学生发布买家秀路由
// ============================================
router.post('/reviews', async (req, res) => {
  try {
    const { dish_id, content, images, rating } = req.body;
    
    if (!dish_id || !rating) {
      return res.status(400).json({
        status: -1,
        message: '菜品ID和评分不能为空'
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        status: -1,
        message: '评分必须在1-5分之间'
      });
    }
    
    // 暂时返回成功信息
    res.status(200).json({
      status: 0,
      message: '发布买家秀成功！',
      data: {
        id: Date.now(),
        dish_id: dish_id,
        content: content || '',
        images: images || [],
        rating: rating,
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('发布买家秀错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

// ============================================
// 获取排行榜路由
// ============================================
router.get('/ranking', async (req, res) => {
  try {
    const { month } = req.query; // 从查询参数获取月份
    
    // 暂时返回空列表
    res.status(200).json({
      status: 0,
      message: '获取成功',
      data: {
        month: month || new Date().getMonth() + 1,
        ranking: []
      }
    });
    
  } catch (error) {
    console.error('获取排行榜错误:', error);
    res.status(500).json({
      status: -1,
      message: '服务器错误，请稍后重试'
    });
  }
});

module.exports = router;

