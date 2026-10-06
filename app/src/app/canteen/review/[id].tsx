import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ReviewScreen } from '@/features/square/ReviewScreen';
export default function CanteenReviewRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReviewScreen productId={typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN} />;
}
