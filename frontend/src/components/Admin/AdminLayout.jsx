import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  // 双重校验：如果非管理员，重定向回我的页面
  if (!isAdmin) {
    navigate('/myzone', { replace: true });
    return null;
  }

  return (
    <div className="admin-layout">
      {/* 侧边栏 */}
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isZh={isZh}
      />

      {/* 主内容区 */}
      <div className="admin-main">
        {/* 顶栏 */}
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-topbar__menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label={isZh ? '打开菜单' : 'Open menu'}
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="admin-topbar__back-btn"
            onClick={() => navigate('/myzone')}
            aria-label={isZh ? '返回我的页面' : 'Back to My Zone'}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{isZh ? '返回' : 'Back'}</span>
          </button>
        </header>

        {/* 内容 */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
