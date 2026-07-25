import PersonalAside from './PersonalAside';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function SiteAside({ children = null, className = '' }) {
  return (
    <aside className={joinClassNames('site-web-shell__aside', className)}>
      {children || <PersonalAside />}
    </aside>
  );
}
