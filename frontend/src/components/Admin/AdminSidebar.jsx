import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Flag,
  FileText,
  Megaphone,
  Settings,
  ClipboardList,
  ShieldBan,
  ChevronRight,
} from 'lucide-react';

const SECTIONS = [
  { key: 'dashboard', to: '/myzone/admin', icon: LayoutDashboard, label: 'Dashboard', zh: '数据面板', exact: true },
  { key: 'users', to: '/myzone/admin/users', icon: Users, label: 'Users', zh: '用户管理' },
  { key: 'reports', to: '/myzone/admin/reports', icon: Flag, label: 'Reports', zh: '举报中心' },
  { key: 'announcements', to: '/myzone/admin/announcements', icon: Megaphone, label: 'Announcements', zh: '公告管理' },
  { key: 'sensitive-words', to: '/myzone/admin/sensitive-words', icon: ShieldBan, label: 'Sensitive Words', zh: '敏感词管理' },
  { key: 'config', to: '/myzone/admin/config', icon: Settings, label: 'Settings', zh: '系统配置' },
  { key: 'logs', to: '/myzone/admin/logs', icon: ClipboardList, label: 'Audit Logs', zh: '操作日志' },
];

export default function AdminSidebar({ open, onClose, isZh }) {
  const location = useLocation();

  const isActive = (to, exact) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {open && (
        <div
          className="admin-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${open ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__header">
          <h2 className="admin-sidebar__title">
            {isZh ? '管理员后台' : 'Admin Panel'}
          </h2>
        </div>

        <nav className="admin-sidebar__nav">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.key}
              to={s.to}
              end={s.exact}
              onClick={onClose}
              className={`admin-sidebar__link${isActive(s.to, s.exact) ? ' admin-sidebar__link--active' : ''}`}
            >
              <s.icon className="h-5 w-5" />
              <span>{isZh ? s.zh : s.label}</span>
              {isActive(s.to, s.exact) && <ChevronRight className="h-4 w-4 ml-auto" />}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
