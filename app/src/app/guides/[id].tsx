import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { GuideDetailScreen } from '@/features/guides/GuidesScreens';
export default function GuideRoute(): React.ReactElement {
 const { id } = useLocalSearchParams<{ id: string | string[] }>();
 return <GuideDetailScreen articleId={typeof id === 'string' ? id : ''} />;
}
