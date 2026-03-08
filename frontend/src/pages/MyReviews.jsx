import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyProductReviews } from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import ReviewCard from '../components/ReviewCard';
import EmptyState from '../components/EmptyState';
import './MyReviews.css';

/** 我的点评列表：展示当前用户对商品的一级点评，复用卡片样式，接 API */
function MyReviews() {
  const { token } = useAuth();
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
          title="请先登录"
          description="登录后查看我的点评。Please log in to view your reviews."
          actionLabel="去登录"
          actionTo="/login"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="myreviews-page">
        <p className="myreviews-loading state-loading">加载中 Loading…</p>
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
          title="暂无点评"
          description="去食堂给喜欢的菜品写一条吧。No reviews yet. Go write one!"
          actionLabel="去食堂"
          actionTo="/eat"
        />
      </div>
    );
  }

  return (
    <div className="myreviews-page">
      <p className="myreviews-intro">我发布的商品点评 My product reviews</p>
      <ul className="myreviews-list" aria-label="我的点评列表">
        {list.map((review) => (
          <li key={review.id}>
            <ReviewCard review={review} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MyReviews;
