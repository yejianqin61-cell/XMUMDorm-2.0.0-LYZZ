import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { getRegions, getRegionTopProductsByCode } from '../api/canteen';
import { getApiErrorMessage } from '../utils/apiError';
import { AREA_LABELS } from '../components/AreaCard';
import './Rankings.css';
import './AreaProductRanking.css';

const FULL_LIMIT = 50;

/**
 * 分区商品排行榜完整页：与全站排行榜「最夯单品」样式一致，数据仅限本区域
 * 路由：/eat/:area/ranking
 */
function AreaProductRanking() {
  const { area } = useParams();
  const code = area ?? '';
  const [areaLabel, setAreaLabel] = useState(AREA_LABELS[code] ?? code ?? '');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) {
      setList([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getRegions(), getRegionTopProductsByCode(code, { limit: FULL_LIMIT }).catch(() => [])])
      .then(([regions, products]) => {
        if (cancelled) return;
        const arr = Array.isArray(regions) ? regions : [];
        const r = arr.find((x) => x.code === code);
        setAreaLabel(r?.name ?? AREA_LABELS[code] ?? code);
        setList(Array.isArray(products) ? products : []);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="area-ranking-page">
        <p className="rankings-loading state-loading">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="area-ranking-page">
        <p className="rankings-error state-error">{error}</p>
        <Link to={`/eat/${encodeURIComponent(code)}`} className="area-ranking-back-link">
          返回分区
        </Link>
      </div>
    );
  }

  return (
    <div className="area-ranking-page">
      <p className="area-ranking-back">
        <Link to={`/eat/${encodeURIComponent(code)}`} className="area-ranking-back-link">
          ← 返回 {areaLabel}
        </Link>
      </p>

      <Card as="div" className="rankings-section-card area-ranking-main-card">
        <div className="rankings-section-header">
          <h1 className="rankings-section-title area-ranking-h1">
            分区商品榜
            <span className="rankings-section-title-en">{areaLabel}</span>
          </h1>
          <p className="rankings-section-desc">
            本区域内有点评的商品按综合评分排名；同分则更晚上架在前。最多展示 {FULL_LIMIT} 名。
          </p>
        </div>
        <div className="rankings-section-content">
          {list.length === 0 ? (
            <EmptyState
              title="暂无榜单数据"
              description="本区商品产生点评后将按综合评分自动上榜。No ranked items in this area yet."
            />
          ) : (
            list.map((item) => (
              <Link key={item.id} to={`/eat/food/${item.id}`} className="rankings-row">
                <span className="rankings-rank">{item.rank}</span>
                <span className="rankings-name">{item.name}</span>
                <span className="rankings-meta">
                  {item.shop_name}
                  {item.comprehensive_score != null && (
                    <> · 评分 {Number(item.comprehensive_score).toFixed(1)}/10</>
                  )}
                  {item.price != null && Number(item.price) > 0 && (
                    <> · RM {Number(item.price).toFixed(2)}</>
                  )}
                </span>
              </Link>
            ))
          )}
        </div>
      </Card>

      <p className="area-ranking-footnote">
        在分区商家列表页顶部可横向滑动预览前 20 名；本页展示完整榜单（最多 {FULL_LIMIT} 条）。
      </p>
    </div>
  );
}

export default AreaProductRanking;
