import { useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getCampusPostComments, getCampusCommentReplies, postCampusPostComment, deleteCampusComment } from '@shared/api/square';
import { getUploadUrl } from '@shared/api/config';
import { useAuth } from '../../context/AuthContextState';
import { commentIntent, loadCommentIntent, finishCommentIntent } from './campusCommentIntent';
import { deletionReason } from './campusCommentDeletion';
import './CampusComments.css';

function CommentRow({ comment, rootDeleted, busy, onReply, onDelete }) {
  return <article className="campus-thread-row">
    <img src={comment.author?.avatar ? getUploadUrl(comment.author.avatar) : '/default-avatar.svg'} alt="" width="32" height="32" />
    <div><header><strong>{comment.author?.name || '用户已不可用'}</strong><time>{new Date(comment.created_at).toLocaleString()}</time></header>
      {comment.reply_to && <span className="campus-reply-target">回复 {comment.reply_to.display_name}{comment.reply_to.is_deleted ? '（评论已删除）' : ''}</span>}
      <p>{comment.is_deleted ? '评论已删除' : comment.content}</p>
      {!comment.is_deleted && <div className="campus-comment-tools">
        <button type="button" disabled={busy || rootDeleted} onClick={()=>onReply(comment)}>回复</button>
        {comment.can_delete && <button type="button" disabled={busy} onClick={()=>onDelete(comment)}>删除</button>}
      </div>}
    </div>
  </article>;
}
function Thread({ root, postId, viewer, snapshot, options, busy, onReply, onDelete }) {
  const replies=useInfiniteQuery({queryKey:['campus-comment-replies',viewer,postId,root.id,snapshot],
    queryFn:({pageParam})=>getCampusCommentReplies(postId,root.id,{...options,cursor:pageParam}),initialPageParam:root.reply_start_cursor,
    initialData:{pages:[{items:root.replies,next_cursor:root.reply_next_cursor}],pageParams:[root.reply_start_cursor]},
    getNextPageParam:last=>last.next_cursor || undefined,retry:false,staleTime:0});
  const rows=[...new Map((replies.data?.pages||[]).flatMap(p=>p.items).map(c=>[c.id,c])).values()];
  return <li className="campus-comment-thread"><CommentRow comment={root} busy={busy} onReply={onReply} onDelete={onDelete} />
    {!replies.isError && <div className="campus-thread-replies">{rows.map(c=><CommentRow key={c.id} comment={c} rootDeleted={root.is_deleted} busy={busy} onReply={onReply} onDelete={onDelete} />)}</div>}
    {replies.isError && <p role="alert">{replies.error.message}<button type="button" onClick={()=>replies.refetch()}>重试回复</button></p>}
    {replies.hasNextPage && <button type="button" disabled={replies.isFetching} onClick={()=>replies.fetchNextPage()}>加载更多回复</button>}
  </li>;
}
function Comments({ postId, user, token, isLoggedIn }) {
  const client=useQueryClient(), viewer=user?.id??'guest',scope=`campus-comment-intent:v1:${viewer}:${postId}`;
  const [restored]=useState(()=>{try{return {intent:loadCommentIntent(sessionStorage,scope)};}catch(e){return {error:e.message};}});
  const [content,setContent]=useState(restored.intent?.body.content||'');
  const [target,setTarget]=useState(restored.intent?.body.reply_to_comment_id?{id:restored.intent.body.reply_to_comment_id,author:{name:'原回复对象'}}:null);
  const [intent,setIntent]=useState(restored.intent||null),[error,setError]=useState(restored.error||''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [deleting,setDeleting]=useState(null),[deleteReason,setDeleteReason]=useState('');
  const guard=useRef(false),input=useRef(null),options={token:token??null};
  const roots=useInfiniteQuery({queryKey:['campus-comments',viewer,String(postId)],
    queryFn:({pageParam})=>getCampusPostComments(postId,{...options,cursor:pageParam}),initialPageParam:null,
    getNextPageParam:last=>last.next_cursor||undefined,retry:false,staleTime:0});
  const refresh=()=>client.invalidateQueries({predicate:q=>['campus-comments','campus-comment-replies','campus-interactions','campus-news-live','campus-news-detail-live','campus-news-route'].includes(q.queryKey[0]) || (q.queryKey[0]==='square'&&['campusPost','campusFeed'].includes(q.queryKey[1]))});
  async function submit(e){
    e.preventDefault();if(guard.current)return;guard.current=true;setBusy(true);setError('');setNotice('');
    try{
      if(!isLoggedIn)throw new Error('请先登录');
      const body={content:content.trim(),...(target?{reply_to_comment_id:String(target.id)}:{})};
      const pending=commentIntent(sessionStorage,scope,body);setIntent(pending);
      const result=await postCampusPostComment(postId,pending.body,pending.key,options);
      if(!result?.id)throw new Error('提交结果未确认，请使用原请求重试');
      finishCommentIntent(sessionStorage,scope,pending.key);setIntent(null);setContent('');setTarget(null);setNotice(result.replayed?'已核对原提交结果':'评论已提交');
      void refresh();
    }catch(e){
      if(e.status===400){const pending=loadCommentIntent(sessionStorage,scope);if(pending)finishCommentIntent(sessionStorage,scope,pending.key);setIntent(null);setError(e.message || '评论格式不正确，请修改后再提交');}
      else setError(`${e.message || '提交结果未确认'}。未确认成功的请求将保留原UUID和内容供重试。`);
      if([401,403,404].includes(e.status))void refresh();
    }
    finally{guard.current=false;setBusy(false);}
  }
  async function remove(){
    if(guard.current)return;
    const c=deleting;if(!c)return;
    let reason;
    try { reason=deletionReason(c,user,deleteReason); }
    catch(e){setError(e.message);return;}
    guard.current=true;setBusy(true);setError('');setNotice('');
    try{await deleteCampusComment(postId,c.id,reason,options);setDeleting(null);setDeleteReason('');setNotice('评论已删除');void refresh();}
    catch(e){setError(e.message||'删除结果未确认，请刷新核对');void refresh();}
    finally{guard.current=false;setBusy(false);}
  }
  const items=[...new Map((roots.data?.pages||[]).flatMap(p=>p.items).map(c=>[c.id,c])).values()];
  const canWrite=isLoggedIn&&roots.isSuccess&&roots.data.pages[0].can_comment===true;
  const canReply=canWrite&&!intent&&!busy&&!restored.error;
  return <section id="campus-news-comments" className="campus-live-comments" aria-label="校园评论">
    <h2>评论 {roots.isSuccess?`(${roots.data.pages[0].comment_count})`:''}</h2>
    {roots.isPending&&<p role="status">正在加载评论…</p>}
    {roots.isError&&<p role="alert">{roots.error.message}<button type="button" onClick={()=>roots.refetch()}>重新加载</button></p>}
    {!roots.isError&&<><ul>{items.map(root=><Thread key={root.id} root={root} postId={String(postId)} viewer={viewer} snapshot={roots.data.pages[0].snapshot_max_id} options={options} busy={!canReply} onReply={c=>{setTarget(c);input.current?.focus();}} onDelete={c=>{setDeleting(c);setDeleteReason('');}} />)}</ul>
      {roots.isSuccess&&!items.length&&<p>暂无评论，欢迎分享你的想法。</p>}
      {roots.hasNextPage&&<button type="button" disabled={roots.isFetching} onClick={()=>roots.fetchNextPage()}>加载更多评论</button>}</>}
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {deleting&&<div role="group" aria-label="确认删除评论" className="campus-delete-confirm">
      <p>删除后原正文将不再展示，已有回复会保留。确认删除这条评论？</p>
      {String(deleting.user_id)!==String(user?.id)&&<label>管理员删除原因（1–500字）<textarea rows="2" value={deleteReason} disabled={busy} onChange={e=>setDeleteReason(e.target.value)} /></label>}
      <button type="button" disabled={busy} onClick={remove}>确认删除评论</button>
      <button type="button" disabled={busy} onClick={()=>{setDeleting(null);setDeleteReason('');}}>取消删除</button>
    </div>}
    {intent&&<p role="status">有一条待核对的提交。请保留原内容重试；刷新后仍可继续核对。</p>}
    {intent&&<button type="button" disabled={busy} onClick={()=>{
      if(window.confirm('原请求可能已经成功。停止核对不会撤销评论；再次提交将使用新UUID，可能产生重复内容。仍要开始新的编辑吗？')){
        try{finishCommentIntent(sessionStorage,scope,intent.key);setIntent(null);setNotice('已停止核对。请先刷新检查原评论，再决定是否重新提交。');}
        catch(e){setError(e.message);}
      }
    }}>停止核对并编辑新提交</button>}
    <form onSubmit={submit}>
      {target&&<p>回复 {target.author?.name || '用户已不可用'} <button type="button" disabled={Boolean(intent)||busy} onClick={()=>setTarget(null)}>取消回复</button></p>}
      <label htmlFor="campus-comment-input">发表评论（最多2000字）</label>
      <textarea id="campus-comment-input" ref={input} rows="3" value={content} disabled={!canWrite||busy||Boolean(intent)||Boolean(restored.error)} onChange={e=>setContent(e.target.value)} />
      <button type="submit" disabled={!canWrite||busy||roots.isError||!content.trim()||[...content.trim()].length>2000||Boolean(restored.error)}>{busy?'正在提交…':intent?'使用原请求重试':'发表评论'}</button>
      {!isLoggedIn&&<p>登录后可评论、回复。</p>}
      {isLoggedIn&&roots.isSuccess&&!canWrite&&<p>这条校园内容当前尚未开放新增评论。</p>}
    </form>
  </section>;
}
export default function CampusComments({ postId }) {
  const auth=useAuth();
  return <Comments key={`${auth.user?.id??'guest'}:${postId}`} postId={postId} {...auth} />;
}
