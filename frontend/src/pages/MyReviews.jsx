import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getMyProductReviews } from '@shared/api/canteen';
import { getApiErrorMessage } from '@shared/utils/apiError';
import ReviewCard from '../components/ReviewCard';
import EmptyState from '../components/ui/EmptyState';
import './MyReviews.css';

/** 我的点评列表：展示当前用户对商品的一级点评，复用卡片样式，接 API */
function MyReviews() {
  const { token } = useAuth();
  const { isZh } = useLanguage();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setList([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyProductReviews({ page: 1, pageSize: 30 }, token)
      .then((data) => {
        if (!cancelled) setList(data?.list ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  if (!token) {
    return (
      <div className="myreviews-page">
        <EmptyState
          title={isZh ? '请先登录' : 'Login required'}
          description={isZh ? '登录后查看我的点评。' : 'Log in to view your reviews.'}
          actionLabel={isZh ? '去登录' : 'Log in'}
          actionTo="/login"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="myreviews-page">
        <p className="myreviews-loading state-loading">{isZh ? '加载中…' : 'Loading…'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="myreviews-page">
        <p className="myreviews-error state-error">{error}</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="myreviews-page">
        <EmptyState
          title={isZh ? '暂无点评' : 'No reviews yet'}
          description={isZh ? '去食堂给喜欢的菜品写一条吧。' : 'Write a review for a dish you like.'}
          actionLabel={isZh ? '去食堂' : 'Go to canteen'}
          actionTo="/eat"
        />
      </div>
    );
  }

  return (
    <div className="myreviews-page">
      <section className="myreviews-hero">
        <div className="myreviews-hero__copy">
          <p className="myreviews-hero__eyebrow">{isZh ? '我的点评' : 'My reviews'}</p>
          <h1 className="myreviews-hero__title">{isZh ? '我写过的商品点评' : 'Reviews I have written'}</h1>
          <p className="myreviews-hero__subtitle">{isZh ? '你的所有点评记录' : 'All reviews you have written'}</p>
        </div>
        <div className="myreviews-hero__stat">
          <span className="myreviews-hero__stat-value">{list.length}</span>
          <span className="myreviews-hero__stat-label">{isZh ? '点评' : 'Reviews'}</span>
        </div>
      </section>

      <div className="myreviews-panel">
        <p className="myreviews-intro">{isZh ? '我发布的商品点评' : 'My product reviews'}</p>
        <ul className="myreviews-list" aria-label={isZh ? '我的点评列表' : 'My review list'}>
          {list.map((review) => (
            <li key={review.id}>
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default MyReviews;
