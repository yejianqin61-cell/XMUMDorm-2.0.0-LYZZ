import { ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContextState';
import { SITE_FRIENDLY_LINK_ITEMS } from '../components/shell/siteShellNav';
import './FriendlyLinks.css';

export default function FriendlyLinks() {
  const { isZh } = useLanguage();

  return (
    <main className="friendly-links-page">
      <header className="friendly-links-page__header">
        <p className="friendly-links-page__eyebrow">XMUM DORM</p>
        <h1>{isZh ? '友情链接' : 'Useful links'}</h1>
        <p>
          {isZh
            ? '常用的学校平台入口，点击即可前往。'
            : 'Quick access to frequently used university platforms.'}
        </p>
      </header>

      <nav className="friendly-links-page__list" aria-label={isZh ? '校方系统链接' : 'University system links'}>
        {SITE_FRIENDLY_LINK_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              className="friendly-links-page__card"
              href={item.href}
              key={item.key}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="friendly-links-page__icon"><Icon size={22} aria-hidden="true" /></span>
              <span className="friendly-links-page__copy">
                <strong>{isZh ? item.labelZh : item.labelEn}</strong>
                <span>{item.href.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              </span>
              <ExternalLink className="friendly-links-page__external" size={18} aria-hidden="true" />
            </a>
          );
        })}
      </nav>
    </main>
  );
}
