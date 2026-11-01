import { Star } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginPath } from '../../utils/loginReturn';
import { useLanguage } from '../../context/LanguageContextState';
import { useCampusFavorite } from './useCampusFavorite';

export default function CampusFavoriteButton({ postId, removeOnly = false }) {
  const favorite = useCampusFavorite(postId);
  const navigate = useNavigate();
  const location = useLocation();
  const { isZh } = useLanguage();
  const label = favorite.favorited ? (isZh ? '取消收藏' : 'Unsave') : (isZh ? '收藏' : 'Save');
  return <>
    <button type="button" aria-label={removeOnly ? (isZh ? '取消收藏快讯' : 'Unsave news') : label}
      aria-pressed={favorite.favorited === true} aria-busy={favorite.pending || favorite.loading}
      className={favorite.favorited ? 'is-favorited' : ''}
      disabled={favorite.isLoggedIn && !favorite.canWrite}
      onClick={() => favorite.isLoggedIn ? favorite.set(removeOnly ? false : !favorite.favorited) : navigate(loginPath(location))}>
      <Star size={19} fill={favorite.favorited ? 'currentColor' : 'none'} />
      <span>{favorite.loading ? (isZh ? '加载中…' : 'Loading…') : favorite.pending ? (isZh ? '保存中…' : 'Saving…') : removeOnly ? (isZh ? '取消收藏' : 'Unsave') : label}</span>
    </button>
    {favorite.error && <span role="alert">{favorite.error} <button type="button" onClick={favorite.retry}>{isZh ? '重试' : 'Retry'}</button></span>}
  </>;
}
