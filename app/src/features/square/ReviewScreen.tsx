import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Form, useForm } from '@/components/ui/Form';
import type { FormFieldDescriptor } from '@/components/ui/FormField';
import { MediaPicker, type PickedImage, type PickResult } from '@/components/ui/MediaPicker';
import { RatingScale, type RatingTierKey } from '@/components/ui/RatingScale';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/features/auth/session';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import { useI18n } from '@/i18n';
import { postProductComment } from '../../../../shared/api/canteen';
import { REVIEW_CONTENT_FIELD, REVIEW_IMAGES_FIELD, reviewRating } from './review';
import { invalidateCanteen } from './canteenCache';

function ReviewForm({ productId, pickImage }: { productId: number; pickImage?: () => Promise<PickResult> }): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const badge = useMailboxBadge();
  const fields = React.useMemo<readonly FormFieldDescriptor[]>(() => [
    { name: 'rating', kind: 'custom', labelKey: 'canteen.review.rating', required: true,
      validate: (value) => reviewRating(value) === null ? 'canteen.review.chooseRating' : undefined,
      render: ({ value, onChange, disabled }) => <RatingScale testID="review-rating" value={value as RatingTierKey | null} disabled={disabled} onChange={onChange} /> },
    REVIEW_CONTENT_FIELD,
    { ...REVIEW_IMAGES_FIELD, render: ({ value, onChange, disabled }) => {
      const images = Array.isArray(value) ? value as PickedImage[] : [];
      return <View>{[0, 1, 2].map((index) => <MediaPicker key={index} testID={`review-image-${index}`} value={images[index] ?? null} disabled={disabled}
        onChange={(image) => { const next = [...images]; if (image) next[index] = image; else next.splice(index, 1); onChange(next.filter(Boolean)); }}
        onPick={pickImage} maxBytes={8 * 1024 * 1024} allowGif={false} pickLabel={t('canteen.review.pickImage')} removeLabel={t('canteen.review.removeImage')}
        unavailableLabel={t('canteen.review.imagesUnavailable')} failureLabel={t('canteen.review.pickFailed')} tooLargeLabel={t('canteen.review.imageTooLarge')} gifNotAllowedLabel={t('canteen.review.imageFormat')} />)}</View>;
    } },
  ], [t, pickImage]);
  const form = useForm({ formId: `canteen-review-${timetableIdentity().scope}-${productId}`, fields, initialValues: { rating: null, content: '', images: [] },
    onSubmit: async (values) => {
      const owner = timetableIdentity().epoch;
      try {
        const images = Array.isArray(values.images) ? values.images as PickedImage[] : [];
        await postProductComment(productId, { rating: reviewRating(values.rating), content: String(values.content).trim(),
          imageFiles: images.map((image, index) => ({ uri: image.uri, type: image.mimeType ?? 'image/jpeg', name: `review-${index}.${image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg'}` })) });
      } catch (error) {
        if (owner !== timetableIdentity().epoch) throw error;
        const classified = toToolsError(error, await session.handleAuthFailure(error));
        throw classified.kind === 'validation' ? { ...classified, target: t('canteen.review.title'), params: { rule: t('canteen.review.serverRule') } } : classified;
      }
      // A storage failure cannot turn a committed review into a retryable write.
      await invalidateCanteen().catch(() => undefined);
    },
  });
  const detail = () => router.replace({ pathname: '/canteen/product/[id]', params: { id: String(productId) } });
  return <Form testID="review-form" titleKey="canteen.review.title" {...badge} guardNavigation form={form} sections={[{ title: 'canteen.review.title', fields }]} semantic="create" onSettled={detail}
    onCancel={() => router.canGoBack() ? router.back() : detail()} onRetrySubmit={() => void form.submit()}
    labels={{ submit: t('canteen.review.submit'), cancel: t('action.cancel'), errorSummaryTitle: t('canteen.review.failed'), leaveTitle: t('form.leave.title'), leaveBody: t('form.leave.body'), leaveConfirm: t('form.leave.confirm'), leaveCancel: t('form.leave.cancel') }} />;
}

export function ReviewScreen({ productId, pickImage }: { productId: number; pickImage?: () => Promise<PickResult> }): React.ReactElement {
  useSession();
  const { t } = useI18n();
  const router = useRouter();
  if (!Number.isSafeInteger(productId) || productId <= 0) return <Screen titleKey="canteen.review.title" bottomMode="own">
    <EmptyState testID="review-product-missing" kind="noResult" title={t('canteen.dishMissing')} actionLabel={t('action.back')} onAction={() => router.replace('/canteen')} />
  </Screen>;
  return <ReviewForm key={`${timetableIdentity().epoch}:${productId}`} productId={productId} pickImage={pickImage} />;
}
