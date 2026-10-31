import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { CampusDetailScreen } from '@/features/campus/CampusScreens';

/** 万能墙详情路由（甲）：阶段A-07 起接受通知带来的评论定位参数。 */
export default function WallRoute(): React.ReactElement {
  const { id, comment } = useLocalSearchParams<{ id: string | string[]; comment?: string }>();
  return (
    <CampusDetailScreen
      postId={typeof id === 'string' ? id : ''}
      kind="wall"
      comment={typeof comment === 'string' ? comment : undefined}
    />
  );
}
