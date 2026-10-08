import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ReviewScreen } from '@/features/square/ReviewScreen';
import { pickReviewImage } from '@/features/square/pickReviewImage';
export default function CanteenReviewRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReviewScreen productId={typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN} pickImage={pickReviewImage} />;
}
