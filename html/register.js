// 注册页面 JavaScript
// 创建时间: 2025-01-26
// 最新修改: 2025-01-26 - 支持商家/非商家注册

document.addEventListener('DOMContentLoaded', function() {
  const registerForm = document.getElementById('registerForm');
  const messageDiv = document.getElementById('message');
  const roleInputs = document.querySelectorAll('input[name="role"]');
  const studentFields = document.getElementById('studentFields');
  const merchantFields = document.getElementById('merchantFields');
  const sendCodeBtn = document.getElementById('sendCodeBtn');

  // 显示消息函数
  // 创建时间: 2025-01-26
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
    messageDiv.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  }

  // 角色切换处理
  // 修改时间: 2025-01-26
  roleInputs.forEach(input => {
    input.addEventListener('change', function() {
      if (this.value === 'student') {
        // 显示学生字段，隐藏商家字段
        studentFields.style.display = 'block';
        merchantFields.style.display = 'none';
        // 清除商家字段的必填验证
        document.getElementById('merchantUsername').required = false;
        document.getElementById('inviteCode').required = false;
        // 设置学生字段为必填
        document.getElementById('email').required = true;
        document.getElementById('emailCode').required = true;
        document.getElementById('username').required = true;
      } else {
        // 显示商家字段，隐藏学生字段
        studentFields.style.display = 'none';
        merchantFields.style.display = 'block';
        // 清除学生字段的必填验证
        document.getElementById('email').required = false;
        document.getElementById('emailCode').required = false;
        document.getElementById('username').required = false;
        // 设置商家字段为必填
        document.getElementById('merchantUsername').required = true;
        document.getElementById('inviteCode').required = true;
      }
    });
  });

  // 发送验证码按钮处理
  // 修改时间: 2025-01-26
  sendCodeBtn.addEventListener('click', async function() {
    const email = document.getElementById('email').value.trim();
    
    // 验证邮箱格式
    if (!email) {
      showMessage('请先输入邮箱', 'error');
      return;
    }
    
    if (!email.endsWith('@xmu.edu.my')) {
      showMessage('邮箱必须是 @xmu.edu.my 格式', 'error');
      return;
    }
    
    // 发送验证码请求
    // 修改时间: 2025-01-26
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/auth/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
      });
      
      const data = await response.json();
      
      if (data.status === 0) {
        showMessage('验证码已发送（功能待实现）', 'success');
        // TODO: 实现倒计时功能
        // 修改时间: 2025-01-26
      } else {
        showMessage(data.message || '发送验证码失败', 'error');
      }
    } catch (error) {
      console.error('发送验证码错误:', error);
      showMessage('网络错误，请稍后重试', 'error');
    }
  });

  // 处理注册表单提交
  // 修改时间: 2025-01-26 - 支持商家/非商家注册
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault(); // 阻止表单默认提交行为

    // 获取选中的角色
    // 修改时间: 2025-01-26
    const selectedRole = document.querySelector('input[name="role"]:checked').value;
    
    // 获取表单数据
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 验证密码
    // 修改时间: 2025-01-26
    if (password.length < 6) {
      showMessage('密码长度至少为6个字符', 'error');
      return;
    }

    // 验证两次密码是否一致
    if (password !== confirmPassword) {
      showMessage('两次输入的密码不一致', 'error');
      return;
    }

    // 根据角色准备不同的数据
    // 修改时间: 2025-01-26
    let requestData = {
      role: selectedRole,
      password: password
    };

    if (selectedRole === 'student') {
      // 非商家注册数据
      const email = document.getElementById('email').value.trim();
      const username = document.getElementById('username').value.trim();
      const emailCode = document.getElementById('emailCode').value.trim();
      
      // 验证非商家字段
      if (!email || !username || !emailCode) {
        showMessage('请填写所有必填字段', 'error');
        return;
      }
      
      // 验证邮箱格式
      if (!email.endsWith('@xmu.edu.my')) {
        showMessage('邮箱必须是 @xmu.edu.my 格式', 'error');
        return;
      }
      
      requestData.email = email;
      requestData.username = username;
      requestData.verification_code = emailCode;
      
    } else if (selectedRole === 'merchant') {
      // 商家注册数据
      const username = document.getElementById('merchantUsername').value.trim();
      const inviteCode = document.getElementById('inviteCode').value.trim();
      
      // 验证商家字段
      if (!username || !inviteCode) {
        showMessage('请填写所有必填字段', 'error');
        return;
      }
      
      requestData.username = username;
      requestData.invite_code = inviteCode;
    }

    // 发送注册请求
    // 修改时间: 2025-01-26
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.status === 0) {
        // 注册成功
        // 保存 token 到 localStorage
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        
        // 保存用户信息
        if (data.data) {
          localStorage.setItem('user', JSON.stringify(data.data));
        }

        showMessage('注册成功！正在跳转...', 'success');
        
        // 跳转到登录页面
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1000);
      } else {
        // 注册失败
        showMessage(data.message || '注册失败，请稍后重试', 'error');
      }
    } catch (error) {
      // 网络错误处理
      console.error('注册错误:', error);
      showMessage('网络错误，请稍后重试', 'error');
    }
  });
});

