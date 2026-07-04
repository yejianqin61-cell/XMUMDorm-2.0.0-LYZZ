import { useEffect, useState } from 'react';
import Layout from '../Layout';
import SiteWebShell from './SiteWebShell';

const TABLET_MIN_WIDTH = 768;
const DESKTOP_MIN_WIDTH = 1024;
const WIDE_MIN_WIDTH = 1440;

function getViewportBucket() {
  if (typeof window === 'undefined') {
    return 'mobile';
  }

  const width = window.innerWidth || 0;

  if (width >= WIDE_MIN_WIDTH) return 'wide';
  if (width >= DESKTOP_MIN_WIDTH) return 'desktop';
  if (width >= TABLET_MIN_WIDTH) return 'tablet';
  return 'mobile';
}

export default function SiteShellRoute() {
  const [viewportBucket, setViewportBucket] = useState(getViewportBucket);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setViewportBucket(getViewportBucket());
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (viewportBucket === 'mobile') {
    return <Layout mode="mobile" />;
  }

  const shellClassName = viewportBucket === 'tablet'
    ? 'site-web-shell--tablet'
    : viewportBucket === 'desktop'
      ? 'site-web-shell--desktop'
      : 'site-web-shell--wide';

  return (
    <SiteWebShell
      className={shellClassName}
      contentClassName="site-web-shell__content--layout"
      showAside={viewportBucket !== 'tablet'}
    >
      <Layout mode="desktop" />
    </SiteWebShell>
  );
}
