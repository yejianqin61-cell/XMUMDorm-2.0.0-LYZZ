/** 真实万能墙行的适配层：后端行 → 自由帖卡片（匿名投影，旧六卡版式不再参与呈现）。 */
import * as React from 'react';

import type { Post } from './campusModel';
import { WallPostCard } from './WallPostCard';
import { wallPostFromRow } from './wallPost';

export function WallPostRow({ post, onOpen }: { post: Post; onOpen: () => void }): React.ReactElement {
  return <WallPostCard post={wallPostFromRow(post)} onOpen={onOpen} />;
}
