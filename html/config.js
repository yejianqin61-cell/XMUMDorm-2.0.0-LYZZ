// 前端 API 配置
// 本地开发：使用 http://127.0.0.1:4040
// 生产环境：使用实际的后端 URL

(function() {
  const isLocal = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname === '';

  if (isLocal) {
    window.API_BASE_URL = 'http://127.0.0.1:4040';
  } else {
    // 生产环境：部署后需要更新这里的 URL
    window.API_BASE_URL = 'https://your-backend-url.com';
  }

  console.log('API_BASE_URL:', window.API_BASE_URL);
})();




