import SiteHeader from './SiteHeader';
import SiteSidebar from './SiteSidebar';
import SiteAside from './SiteAside';
import ShellContent from './ShellContent';
import './SiteWebShell.css';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteWebShell({
  header = null,
  sidebar = null,
  aside = null,
  children = null,
  className = '',
  contentClassName = '',
  showAside = true,
}) {
  return (
    <div className={joinClassNames('site-web-shell', className)}>
      <SiteHeader>{header}</SiteHeader>
      <div className="site-web-shell__body">
        <SiteSidebar>{sidebar}</SiteSidebar>
        <ShellContent className={contentClassName}>{children}</ShellContent>
        {showAside ? <SiteAside>{aside}</SiteAside> : null}
      </div>
    </div>
  );
}
