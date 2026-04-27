import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getMySavedHandbookArticles, listMyHandbookChecklists } from '../../api/handbook';
import { QK } from '../../query/queryKeys';
import './Handbook.css';

function HandbookCollections() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { token } = useAuth();
  const tokenKey = token ?? 'guest';

  const savedQuery = useQuery({
    queryKey: QK.handbookMeSaved(tokenKey, 10),
    queryFn: () => getMySavedHandbookArticles({ page: 1, pageSize: 10 }),
    enabled: !!token,
    staleTime: 15 * 1000,
  });

  const checklistsQuery = useQuery({
    queryKey: QK.handbookMeChecklists(tokenKey),
    queryFn: listMyHandbookChecklists,
    enabled: !!token,
    staleTime: 15 * 1000,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const saved = useMemo(() => savedQuery.data?.list || [], [savedQuery.data]);
  const checklists = checklistsQuery.data || [];

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide" className="handbook-back">
          {isZh ? '← 返回手册' : '← Back'}
        </Link>
      </div>

      <div className="handbook-collections">
        <div className="handbook-collections-title">{isZh ? '收藏与清单' : 'Collections'}</div>

        {!token ? (
          <div className="handbook-empty">
            <div className="handbook-empty-title">{isZh ? '需要登录' : 'Login required'}</div>
            <div className="handbook-empty-sub">{isZh ? '登录后可查看收藏与 Checklist。' : 'Sign in to view saved articles and checklists.'}</div>
          </div>
        ) : (
          <>
            <section className="handbook-section">
              <div className="handbook-section-h">{isZh ? '收藏文章' : 'Saved articles'}</div>
              {saved.length === 0 ? (
                <div className="handbook-mini-empty">{isZh ? '暂无收藏' : 'No saved articles'}</div>
              ) : (
                <div className="handbook-mini-list">
                  {saved.map((a) => (
                    <Link key={a.id} to={`/about/freshman-guide/a/${a.id}`} className="handbook-mini-card">
                      <div className="handbook-mini-title">{a.title}</div>
                      {a.summary ? <div className="handbook-mini-sub">{a.summary}</div> : null}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="handbook-section">
              <div className="handbook-section-h">{isZh ? 'Checklist' : 'Checklist'}</div>
              {checklists.length === 0 ? (
                <div className="handbook-mini-empty">{isZh ? '暂无清单（后续在此页添加编辑 UI）' : 'No checklists yet'}</div>
              ) : (
                <div className="handbook-mini-list">
                  {checklists.map((c) => (
                    <div key={c.id} className="handbook-mini-card">
                      <div className="handbook-mini-title">{c.title}</div>
                      <div className="handbook-mini-sub">
                        {(c.items || []).filter((x) => x && x.is_done).length}/{(c.items || []).length} {isZh ? '已完成' : 'done'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="handbook-section">
              <div className="handbook-section-h">{isZh ? '课程测评' : 'Course reviews'}</div>
              <Link to="/about/freshman-guide/course-review" className="handbook-btn handbook-btn--ghost">
                {isZh ? '进入课程测评' : 'Open course reviews'}
              </Link>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default HandbookCollections;

