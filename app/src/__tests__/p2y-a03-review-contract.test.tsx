import { reviewRating, validateReview, REVIEW_IMAGES_FIELD } from '@/features/square/review';
import { invalidateCanteen, canteenRevision, subscribeCanteen } from '@/features/square/canteenCache';

it('maps all five tiers to the backend enum', () => {
  expect(['hot', 'top', 'above', 'npc', 'dead'].map(reviewRating)).toEqual(['夯爆了', '顶级', '人上人', 'NPC', '拉完了']);
});
it('accepts 300 characters and rejects 301', () => {
  expect(validateReview({ rating: 'hot', content: 'x'.repeat(300), images: [] })).toEqual({});
  expect(validateReview({ rating: 'hot', content: 'x'.repeat(301), images: [] })).toEqual({ content: 'canteen.review.tooLong' });
});
it('requires a rating and nonempty content', () => {
  expect(validateReview({ rating: null, content: '  ', images: [] })).toEqual({ rating: 'canteen.review.chooseRating', content: 'form.error.required' });
});
it('limits images to three and excludes media from drafts', () => {
  expect(validateReview({ rating: 'above', content: 'Good', images: [1, 2, 3] })).toEqual({});
  expect(validateReview({ rating: 'above', content: 'Good', images: [1, 2, 3, 4] })).toEqual({ images: 'canteen.review.tooManyImages' });
  expect(REVIEW_IMAGES_FIELD.neverDraft).toBe(true);
});
it('increments the cache version and supports unsubscribe', async () => {
  const start = canteenRevision();
  const listener = jest.fn();
  const unsubscribe = subscribeCanteen(listener);
  await invalidateCanteen();
  expect(canteenRevision()).toBe(start + 1);
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
  await invalidateCanteen();
  expect(listener).toHaveBeenCalledTimes(1);
});
