import * as React from 'react';
import { View } from 'react-native';
import { groupComments, visibleReplies, canReplyTo, type CommentNode } from '@/components/ui/CommentThread';
import { CommentItem } from '@/components/ui/CommentItem';
import { Pressable } from '@/components/ui/Pressable';
import { MediaGrid } from '@/components/ui/MediaGrid';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { getUploadUrl } from '../../../../shared/api/config';
import { ratingTierLabelKey, type CanteenComment } from './canteen';
import { TranslateToggle } from '../translate/TranslateToggle';

/** Domain composition adds rating and media around the shared thread primitives. */
export function DishCommentThread({ comments, onReply, isSignedIn = false }: { comments: readonly CanteenComment[]; onReply?: (id: number) => void; isSignedIn?: boolean }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(new Set());
  const byId = new Map(comments.map((comment) => [String(comment.id), comment]));
  const nodes: readonly CommentNode[] = comments.map((comment) => ({ id: String(comment.id), parentId: comment.parentId === null ? null : String(comment.parentId), depth: comment.parentId === null ? 0 : 1,
    author: comment.isMerchantReply ? { kind: 'named', name: comment.authorNickname ?? t('canteen.merchant'), avatarUri: comment.authorAvatar, levelLabel: t('canteen.merchant') } : { kind: 'anonymous' },
    content: comment.content, createdAtLabel: comment.createdAt ?? '' }));
  const labels = { anonymous: t('canteen.anonymous'), deleteLabel: t('screen.campus.read.delete'), replyLabel: t('screen.campus.read.reply'), likeLabel: t('screen.campus.read.like') };
  const render = (node: CommentNode): React.ReactElement => {
    const comment = byId.get(node.id)!;
    const tier = ratingTierLabelKey(comment.rating);
    // An orphan retains its original parent id even when groupComments presents it as a group root.
    const depth = comment.parentId === null ? 0 : 1;
    return <Surface key={node.id} testID={`dish-comment-${node.id}`} rounded="radius_medium" bordered="subtle" padding="space_3">
      {tier ? <View style={{ flexDirection: 'row' }}><Surface testID={`dish-comment-${node.id}-tier`} rounded="radius_small" bordered="subtle" padding="space_1"><Text role="caption" colorToken="text-secondary">{t(tier)}</Text></Surface></View> : null}
      <CommentItem author={node.author} content={node.content} createdAtLabel={node.createdAtLabel} depth={depth} labels={labels}
        contentAccessory={<TranslateToggle kind="review" id={comment.id} text={comment.content} isSignedIn={isSignedIn} testID={`dish-comment-${node.id}-translate`} />}
        onReply={onReply && canReplyTo(depth) ? () => onReply(comment.id) : undefined} />
      {comment.images.length > 0 ? <MediaGrid testID={`dish-comment-${node.id}-images`} uris={comment.images.map(getUploadUrl)} alt={comment.images.map(() => comment.content)} /> : null}
    </Surface>;
  };
  return <View testID="dish-comments" style={{ gap: theme.space('space_3') }}>
    {groupComments(nodes).map((group) => {
      const isExpanded = expanded.has(group.root.id);
      const shown = visibleReplies(group.replies, isExpanded);
      return <View key={group.root.id} style={{ gap: theme.space('space_2') }}>
        {render(group.root)}
        {shown.length ? <View style={{ paddingLeft: theme.space('space_4'), gap: theme.space('space_2') }}>{shown.map(render)}</View> : null}
        {group.replies.length > shown.length || isExpanded ? <Pressable testID={`dish-comment-${group.root.id}-toggle`} accessibilityLabel={t(isExpanded ? 'screen.campus.read.collapse' : 'canteen.loadMore')}
          onPress={() => setExpanded((previous) => { const next = new Set(previous); if (next.has(group.root.id)) next.delete(group.root.id); else next.add(group.root.id); return next; })}
          style={{ minHeight: theme.touchTarget, justifyContent: 'center' }}><Text role="caption" colorToken="text-brand">{t(isExpanded ? 'screen.campus.read.collapse' : 'canteen.loadMore')}</Text></Pressable> : null}
      </View>;
    })}
  </View>;
}
