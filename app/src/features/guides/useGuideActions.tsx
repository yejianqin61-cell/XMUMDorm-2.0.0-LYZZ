import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { CommentComposer } from '@/components/ui/CommentComposer';
import type { CommentNode } from '@/components/ui/CommentThread';
import { Text } from '@/components/ui/Text';
import { useListPagination } from '@/components/ui/ListScreen';
import { useRouter } from 'expo-router';
import { useSession } from '@/features/auth/session';
import { useI18n } from '@/i18n';
import { createHandbookComment, listHandbookComments, toggleHandbookLike } from '../../../../shared/api/handbook';

type GuideArticle = { id: number; viewer?: { liked?: boolean }; liked?: boolean; likes_count?: number; comment_count?: number };
type RawComment = { id?: unknown; content?: unknown; parent_id?: unknown; created_at?: unknown; author?: { nickname?: unknown; username?: unknown }; replies?: unknown };

function asCount(value: unknown): number | null { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null; }
function asNode(value: unknown, parentId: number | null): CommentNode {
 if (!value || typeof value !== 'object') throw new Error('Invalid handbook comment');
 const row = value as RawComment;
 if (!Number.isSafeInteger(row.id) || Number(row.id) <= 0 || typeof row.content !== 'string') throw new Error('Invalid handbook comment');
 return { id: String(row.id), parentId: parentId === null ? null : String(parentId), depth: parentId === null ? 0 : 1,
  content: row.content, createdAtLabel: typeof row.created_at === 'string' ? row.created_at : '',
  author: { kind: 'named', name: typeof row.author?.nickname === 'string' ? row.author.nickname : typeof row.author?.username === 'string' ? row.author.username : '—' } };
}
function asNodes(value: unknown): CommentNode[] {
 if (!Array.isArray(value)) throw new Error('Invalid handbook comments');
 const nodes: CommentNode[] = [];
 for (const row of value) {
  const root = asNode(row, null); nodes.push(root);
  const replies = (row as RawComment).replies;
  if (replies !== undefined && !Array.isArray(replies)) throw new Error('Invalid handbook replies');
  for (const reply of replies ?? []) nodes.push(asNode(reply, Number(root.id)));
 }
 return nodes;
}

/** Handbook mutations stay within this feature and consume only existing server contracts. */
export function useGuideActions(article: GuideArticle | null) {
 const { t } = useI18n(); const session = useSession(); const router = useRouter();
 const [nodes, setNodes] = React.useState<CommentNode[]>([]);
 const [draft, setDraft] = React.useState(''); const [reply, setReply] = React.useState<CommentNode | null>(null);
 const [liked, setLiked] = React.useState(false); const [likeCount, setLikeCount] = React.useState<number | null>(null);
 const [commentCount, setCommentCount] = React.useState<number | null>(null); const [sending, setSending] = React.useState(false);
 const [notice, setNotice] = React.useState<'login' | 'likeFailed' | 'sendFailed' | null>(null);
 const { pagination, dispatch } = useListPagination({ initial: { hasMore: false } });
 const epoch = React.useRef(0); const busy = React.useRef({ read: false, like: false, send: false });
 const loadComments = React.useCallback(async () => {
  if (!article || busy.current.read) return;
  busy.current.read = true; const request = epoch.current; dispatch({ type: 'append:start' });
  try { const data = await listHandbookComments(article.id); if (request !== epoch.current) return; setNodes(asNodes(data)); dispatch({ type: 'append:success', hasMore: false }); }
  catch { if (request === epoch.current) dispatch({ type: 'append:failure', error: { kind: 'unknown' } }); }
  finally { if (request === epoch.current) busy.current.read = false; }
 }, [article, dispatch]);
 React.useEffect(() => {
  ++epoch.current; busy.current = { read: false, like: false, send: false }; setNodes([]); setDraft(''); setReply(null); setSending(false); setNotice(null);
  setLiked(article?.viewer?.liked === true || article?.liked === true); setLikeCount(asCount(article?.likes_count)); setCommentCount(asCount(article?.comment_count));
  dispatch({ type: 'append:success', hasMore: false }); void loadComments();
  return () => { ++epoch.current; };
 }, [article, dispatch, loadComments]);
 const requiresLogin = () => { if (session.isSignedIn) return true; setNotice('login'); return false; };
 const toggleLike = async () => {
  if (!article || busy.current.like || !requiresLogin()) return;
  busy.current.like = true; const request = epoch.current; setNotice(null);
  try { const result = await toggleHandbookLike(article.id); if (request !== epoch.current) return;
   if (result?.article_id !== article.id || typeof result?.liked !== 'boolean') throw new Error('Invalid handbook like response');
   setLiked(result.liked); if (asCount(result.likes_count) !== null) setLikeCount(result.likes_count); else setLikeCount(null);
  } catch { if (request === epoch.current) setNotice('likeFailed'); }
  finally { if (request === epoch.current) busy.current.like = false; }
 };
 const send = async () => {
  const content = draft.trim(); if (!article || busy.current.send || !requiresLogin() || !content) return;
  busy.current.send = true; const request = epoch.current; const target = reply; setSending(true); setNotice(null);
  try { const payload = target ? { content, parent_id: Number(target.id) } : { content }; const result = await createHandbookComment(article.id, payload);
   if (request !== epoch.current) return; const node = asNode(result, target ? Number(target.id) : null);
   setNodes(current => current.some(item => item.id === node.id) ? current : [...current, node]); setCommentCount(current => current === null ? null : current + 1); setDraft(''); setReply(null);
  } catch { if (request === epoch.current) setNotice('sendFailed'); }
  finally { if (request === epoch.current) { busy.current.send = false; setSending(false); } }
 };
 const body = <>
  {notice === 'login' ? <Button label={t('screen.campus.write.login')} onPress={() => router.push('/login' as never)} /> : null}
  {notice === 'likeFailed' ? <Text role="body">{t('screen.campus.write.likeFailed')}</Text> : null}
  {notice === 'sendFailed' ? <Text role="body">{t('screen.campus.write.sendFailed')}</Text> : null}
  <CommentComposer testID="guide-composer" value={draft} onChangeText={setDraft} placeholder={t('screen.campus.write.placeholder')}
   sendLabel={t('screen.campus.write.send')} onSend={() => void send()} sending={sending} disabled={pagination.append === 'loading'} maxLength={800}
   replyContext={reply ? { kind: 'named', label: t('screen.campus.write.namedReply', { name: reply.author.kind === 'named' ? reply.author.name : '—' }), cancelLabel: t('action.cancel'), onCancel: () => setReply(null) } : undefined} />
 </>;
 return { body, interactions: { liked, likeCount, commentCount }, onToggleLike: () => void toggleLike(), comments: {
  nodes, pagination, onLoadMore: () => undefined, onRetry: () => void loadComments(), title: t('screen.campus.read.comments'),
  onReply: (id: string) => { const node = nodes.find(item => item.id === id && item.depth === 0); if (node) setReply(node); },
 } };
}
