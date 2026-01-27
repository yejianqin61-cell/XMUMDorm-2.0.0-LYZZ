// 登录页面 JavaScript

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const messageDiv = document.getElementById('message');

  // 显示消息=============================================================================
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
    messageDiv.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  }//这一块是显示消息的函数,纯纯的煞笔东西,不解释,没有意义就是个沙雕.
  //不过这样也好,给这个记博封装起来,避免重复代码,增加代码的复用性,提高代码的效率,
  // 增加代码的可靠性,增加代码的稳定性,增加代码的健壮性,增加代码的灵活性,增加代码的可维护性
  // ,增加代码的可读性,增加代码的可扩展性,增加代码的可移植性,增加代码的可重用性,增
  // 加代码的可测试性,增加代码的可调试性,增加代码的可优化性,增加代码的可优化性,
  // 增加代码的可优化性,增加代码的可优化性,增加代码的可优化性,增加代码的可优化性,
  // 增加代码的可优化性,增加代码的可优化性,增加代码的可优化性,增加代码的可优化性,
  // 增加代码的可优化性,增加代码的可优化性,增加代码的可优化性,增加代码的码的可优化性,

  //=====================================================================================
  

  // 处理登录表单提交
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault(); // 阻止表单默认提交行为

    const studentId = document.getElementById('studentId').value.trim();
    const password = document.getElementById('password').value;

    // 简单验证
    if (!studentId || !password) {
      showMessage('请填写学号和密码', 'error');
      return;
    }
//=====================================================================================
// 发送登录请求=============================================================================
    try {
      // 发送登录请求
      // 修改时间: 2025-01-26 - 修正API路径为 /api/auth/login
      const response = await fetch(`${window.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: studentId,
          password: password
        })
      });

      const data = await response.json();

      if (data.status === 0) {
        // 登录成功
        // 保存 token 到 localStorage
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        
        // 保存用户信息
        if (data.data) {
          localStorage.setItem('user', JSON.stringify(data.data));
        }

        showMessage('登录成功！正在跳转...', 'success');
        
        // 跳转到主页（稍后创建）
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        // 登录失败
        showMessage(data.message || '登录失败，请检查学号和密码', 'error');
      }
    } catch (error) {
      console.error('登录错误:', error);
      showMessage('网络错误，请稍后重试', 'error');
    }
  });
});




