import { useLanguage } from '../context/LanguageContextState';
import { getMyProductReviews } from '@shared/api/canteen';
import ReviewCard from '../components/ReviewCard';
import MyContentPage from '../components/MyContentPage';
export default function MyReviews() {
  const { isZh } = useLanguage();
  return <MyContentPage kind="reviews" title={isZh ? '我的点评' : 'My reviews'} load={getMyProductReviews}
    emptyTitle={isZh ? '暂无点评' : 'No reviews yet'} actionLabel={isZh ? '去食堂' : 'Go to canteen'} actionTo="/eat"
    renderItem={review => <ReviewCard review={review} />} />;
}
