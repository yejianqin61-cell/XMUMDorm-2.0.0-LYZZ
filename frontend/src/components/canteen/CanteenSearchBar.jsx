import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getCanteenStrings } from '../../i18n/canteenStrings';
import Card from '../../components/ui/Card';

export default function CanteenSearchBar() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const t = getCanteenStrings(isZh);
  const [q, setQ] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/eat/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form className="canteen-search-bar" onSubmit={handleSubmit}>
      <Card className="flex items-center gap-2 px-3.5 py-2.5">
        <svg className="text-muted-foreground shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          className="flex-1 border-0 outline-none bg-transparent text-[15px] text-[var(--post-ios-label)] placeholder:text-[var(--post-ios-tertiary-label)] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          placeholder={t.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={50}
        />
      </Card>
    </form>
  );
}