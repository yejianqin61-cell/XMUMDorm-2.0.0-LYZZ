import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContextState';
import { getMyFavorites } from '@shared/api/canteen';
import { getMyCampusFavorites } from '@shared/api/campusFavorites';
import MyContentPage from '../components/MyContentPage';
import CampusFavoriteButton from '../features/campus-news/CampusFavoriteButton';

function timestamp(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(date) : '—';
}

export default function MyFavorites() {
  const { isZh } = useLanguage();
  const [category, setCategory] = useState('dishes');
  const campus = category === 'news';
  const categories = [['dishes', isZh ? '食堂菜品' : 'Canteen dishes'], ['news', isZh ? '校园快讯' : 'Campus news']];
  return <MyContentPage key={category} kind={`favorites:${category}`} title={isZh ? '我的收藏' : 'My favorites'}
    category={categories.map(([key, label]) => <button type="button" key={key} aria-pressed={category === key} onClick={() => setCategory(key)}>{label}</button>)}
    load={campus ? getMyCampusFavorites : getMyFavorites}
    emptyTitle={campus ? (isZh ? '暂无快讯收藏' : 'No saved news yet') : (isZh ? '暂无菜品收藏' : 'No favorite dishes yet')}
    actionLabel={campus ? (isZh ? '去看校园快讯' : 'Read campus news') : (isZh ? '去食堂' : 'Go to canteen')}
    actionTo={campus ? '/about' : '/eat'}
    renderItem={item => campus ? <article className="my-favorite-card my-favorite-news">
      <Link to={`/about/campus/${item.id}`}><h2>{item.title}</h2><p>{item.summary}</p>
        <p><small>{isZh ? '发布于 ' : 'Published '}{timestamp(item.published_at)} · {isZh ? '收藏于 ' : 'Saved '}{timestamp(item.favorited_at)}</small></p>
      </Link><CampusFavoriteButton postId={item.id} removeOnly />
    </article> : <Link className="my-favorite-card" to={`/eat/food/${item.product_id}`}>
      {item.product_image && <img src={item.product_image} alt="" />}
      <div><h2>{item.product_name}</h2><p>{item.shop_name}</p></div>
    </Link>} />;
}
