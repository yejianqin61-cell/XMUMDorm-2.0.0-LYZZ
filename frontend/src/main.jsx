import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
/*
index.html 里有 <div id="root"></div>
        ↓
main.jsx 执行：document.getElementById('root') 得到这个 div
        ↓
createRoot(这个 div) → 得到「根对象」
        ↓
根对象.render( <StrictMode><App /></StrictMode> )
        ↓
React 把 App（以及 App 里的路由、Layout、页面）画进 div#root
        ↓
用户看到的是你的整站界面（登录页 / 树洞 / 发帖等）
*/

