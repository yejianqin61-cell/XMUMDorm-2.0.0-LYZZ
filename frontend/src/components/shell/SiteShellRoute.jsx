import { useEffect, useState } from 'react';
import Layout from '../Layout';
import SiteWebShell from './SiteWebShell';

const DESKTOP_SHELL_QUERY = '(min-width: 1200px)';

function getDesktopShellMatch() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(DESKTOP_SHELL_QUERY).matches;
}

export default function SiteShellRoute() {
  const [isDesktopShell, setIsDesktopShell] = useState(getDesktopShellMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DESKTOP_SHELL_QUERY);
    const handleChange = (event) => {
      setIsDesktopShell(event.matches);
    };

    setIsDesktopShell(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  if (!isDesktopShell) {
    return <Layout mode="mobile" />;
  }

  return (
    <SiteWebShell contentClassName="site-web-shell__content--layout">
      <Layout mode="desktop" />
    </SiteWebShell>
  );
}
