import type { RatingTierKey } from '@/components/ui/RatingScale';
import type { FormFieldDescriptor, FormValues } from '@/components/ui/FormField';
import type { MessageKey } from '@/i18n/zh';
import { CANTEEN_RATING_TIERS, type CanteenRatingTier } from './canteen';

const TIER_INDEX: Record<RatingTierKey, number> = { hot: 0, top: 1, above: 2, npc: 3, dead: 4 };
export function reviewRating(value: unknown): CanteenRatingTier | null {
  return typeof value === 'string' && Object.hasOwn(TIER_INDEX, value)
    ? CANTEEN_RATING_TIERS[TIER_INDEX[value as RatingTierKey]] : null;
}

export function validateReview(values: FormValues): Record<string, MessageKey> {
  const errors: Record<string, MessageKey> = {};
  if (reviewRating(values.rating) === null) errors.rating = 'canteen.review.chooseRating';
  const content = typeof values.content === 'string' ? values.content.trim() : '';
  if (!content) errors.content = 'form.error.required';
  else if (content.length > 300) errors.content = 'canteen.review.tooLong';
  if (!Array.isArray(values.images) || values.images.length > 3) errors.images = 'canteen.review.tooManyImages';
  return errors;
}

export const REVIEW_IMAGES_FIELD: FormFieldDescriptor = {
  name: 'images', kind: 'custom', labelKey: 'canteen.review.images', neverDraft: true,
  validate: (value) => Array.isArray(value) && value.length <= 3 ? undefined : 'canteen.review.tooManyImages',
};
export const REVIEW_CONTENT_FIELD: FormFieldDescriptor = {
  name: 'content', kind: 'textarea', labelKey: 'canteen.review.content', required: true, maxLength: 300,
  helpKey: 'canteen.review.contentHelp',
  validate: (value) => {
    if (typeof value !== 'string' || !value.trim()) return 'form.error.required';
    return value.trim().length > 300 ? 'canteen.review.tooLong' : undefined;
  },
};
