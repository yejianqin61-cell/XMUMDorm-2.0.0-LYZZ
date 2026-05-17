import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CanteenSearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    navigate(`/eat/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <form className="canteen-search-bar" onSubmit={handleSubmit}>
      <div className="canteen-search-bar-inner">
        <svg className="canteen-search-bar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          className="canteen-search-bar-input"
          placeholder="搜索菜品、美食文章..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={50}
        />
      </div>
    </form>
  );
}
