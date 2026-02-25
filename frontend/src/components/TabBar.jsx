import { NavLink } from 'react-router-dom';

/** 中英并列，方便非中文用户（厦门大学马来西亚分校） */
const TABS = [
  { path: '/', iconKey: 'TreeHole', label: 'TreeHole 树洞' },
  { path: '/eat', iconKey: 'Eat', label: 'Eat 食堂' },
  { path: '/about', iconKey: 'About us', label: 'About us 关于我们' },
  { path: '/myzone', iconKey: 'My Zone', label: 'My Zone 我的' },
];

/** 微信风格底部 Tab：四栏，图标+文字，选中绿色 */
function TabBar() {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
          end={tab.path === '/'}
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon">{getIcon(tab.iconKey, isActive)}</span>
              <span className="tab-label">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function getIcon(label, filled) {
  const size = 24;
  const common = { width: size, height: size, viewBox: '0 0 24 24' };
  if (filled) {
    switch (label) {
      case 'TreeHole':
        return (
          <svg {...common} fill="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'Eat':
        return (
          <svg {...common} fill="currentColor">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1V8zM2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <circle cx="6" cy="2.5" r="1.5" />
            <circle cx="10" cy="2.5" r="1.5" />
            <circle cx="14" cy="2.5" r="1.5" />
          </svg>
        );
      case 'About us':
        return (
          <svg {...common} fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        );
      case 'My Zone':
        return (
          <svg {...common} fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        );
      default:
        return null;
    }
  }
  switch (label) {
    case 'TreeHole':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'Eat':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      );
    case 'About us':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      );
    case 'My Zone':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

export default TabBar;
export { TABS };
