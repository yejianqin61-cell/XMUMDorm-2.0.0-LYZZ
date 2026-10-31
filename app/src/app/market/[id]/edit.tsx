import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MarketEditScreen } from '@/features/marketplace/MarketEditScreen';

/** 二手编辑路由（甲）：只取 params 渲染对方屏幕，⛔ 不写第二套编辑逻辑。 */
export default function MarketEditRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <MarketEditScreen itemId={typeof id === 'string' ? id : ''} />;
}
