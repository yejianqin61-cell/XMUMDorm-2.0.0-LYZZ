import * as React from 'react';
import {useCampusReport} from './useCampusReport';
import {useRouter} from 'expo-router';
import {CommentComposer} from '@/components/ui/CommentComposer';
import type {CommentNode} from '@/components/ui/CommentThread';
import {Button} from '@/components/ui/Button';
import {Text} from '@/components/ui/Text';
import {useListPagination} from '@/components/ui/ListScreen';
import {useSession} from '@/features/auth/session';
import {classifyAuthFailure,isSessionInvalid} from '@/features/auth/authFailure';
import {useI18n} from '@/i18n';
import {toggleLike,getPostComments,createComment,getPostDetail} from '../../../../shared/api/posts';
import {toggleConfessionLike,getConfessionComments,createConfessionComment} from '../../../../shared/api/confessions';

type InteractionPost={id:number;user_liked?:boolean;liked?:boolean;like_count?:number;comment_count?:number};
type Kind='confession'|'wall';
function count(value:unknown):number|null {return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;}
function comment(value:unknown,kind:Kind,parentId:number|null):CommentNode {
 if(!value||typeof value!=='object')throw new Error('Invalid comment');
 const row=value as {id:number;content:string;author?:{nickname?:string;username?:string};created_at?:string};
 if(!Number.isSafeInteger(row.id)||row.id<=0||typeof row.content!=='string')throw new Error('Invalid comment');
 return {id:String(row.id),parentId:parentId===null?null:String(parentId),depth:parentId===null?0:1,
  content:row.content,createdAtLabel:typeof row.created_at==='string'?row.created_at:'',
  author:kind==='wall'?{kind:'anonymous'}:{kind:'named',name:row.author?.nickname||row.author?.username||'—'}};
}
function comments(value:unknown,kind:Kind):CommentNode[] {
 if(!Array.isArray(value))throw new Error('Invalid comments');
 const result:CommentNode[]=[];
 for(const row of value){const root=comment(row,kind,null);result.push(root);
  if(row.replies!=null&&!Array.isArray(row.replies))throw new Error('Invalid replies');
  for(const reply of row.replies??[])result.push(comment(reply,kind,Number(root.id)));
 }
 return Array.from(new Map(result.map(node=>[node.id,node])).values());
}

/** Read and write failures stay inside the detail; no public shell or UI changes. */
export function useCampusActions(post:InteractionPost|null,kind:Kind){
 const {t}=useI18n();const router=useRouter();const session=useSession();
 const report=useCampusReport(post?{id:post.id,kind}:null,session.isSignedIn,session.handleAuthFailure);
 const [nodes,setNodes]=React.useState<CommentNode[]>([]),[draft,setDraft]=React.useState('');
 const [reply,setReply]=React.useState<CommentNode|null>(null),[sending,setSending]=React.useState(false);
 const [liked,setLiked]=React.useState(false),[likeCount,setLikeCount]=React.useState<number|null>(null);
 const [commentCount,setCommentCount]=React.useState<number|null>(null);
 const [notice,setNotice]=React.useState<'likeFailed'|'sendFailed'|'login'|'denied'|null>(null);
 const {pagination,dispatch}=useListPagination({initial:{hasMore:false}});
 const epoch=React.useRef(0),locks=React.useRef({like:false,send:false,read:false});
 const draftRef=React.useRef(draft);draftRef.current=draft;
 const replyRef=React.useRef(reply);replyRef.current=reply;
 const loadComments=React.useCallback(async()=>{
  if(!post||locks.current.read||locks.current.send)return;locks.current.read=true;const request=epoch.current;
  dispatch({type:'append:start'});
  try{const data=kind==='wall'?await getConfessionComments(post.id):await getPostComments(post.id);
   if(request!==epoch.current)return;
   setNodes(comments(data,kind));dispatch({type:'append:success',hasMore:false});
  }catch{if(request===epoch.current)dispatch({type:'append:failure',error:{kind:'unknown'}});}
  finally{if(request===epoch.current)locks.current.read=false;}
 },[post,kind,dispatch]);
 React.useEffect(()=>{
  ++epoch.current;locks.current={like:false,send:false,read:false};setNodes([]);setDraft('');setReply(null);setSending(false);setNotice(null);
  setLiked(kind==='wall'?post?.liked===true:post?.user_liked===true);setLikeCount(count(post?.like_count));setCommentCount(count(post?.comment_count));
  dispatch({type:'append:success',hasMore:false});void loadComments();
  return()=>{++epoch.current;};
 },[post,kind,loadComments,dispatch]);
 const allowed=()=>{if(session.isSignedIn)return true;setNotice('login');return false;};
 const fail=async(error:unknown,request:number,operation:'like'|'send')=>{
  const auth=classifyAuthFailure(error);
  if(request!==epoch.current)return;
  if(isSessionInvalid(auth))await session.handleAuthFailure(error);
  if(request===epoch.current)setNotice(isSessionInvalid(auth)?'login':auth==='sanctioned'?'denied':operation==='like'?'likeFailed':'sendFailed');
 };
 const like=async()=>{
  if(!post||locks.current.like||!allowed())return;
  locks.current.like=true;const request=epoch.current;setNotice(null);
  try{const data=kind==='wall'?await toggleConfessionLike(post.id):await toggleLike(post.id);
   if(request!==epoch.current)return;
   const target=kind==='wall'?data?.confession_id:data?.post_id;
   if(target!==post.id||typeof data?.liked!=='boolean')throw new Error('Invalid like response');
   setLiked(data.liked);
   // Treehole responses omit counts. Preserve the last server count instead of inventing one.
   if(count(data.like_count)!==null)setLikeCount(data.like_count);
   else if(kind==='confession'){
    // The mutation succeeded. A failed count refresh must never retry the toggle.
    setLikeCount(null);
    try{const fresh=await getPostDetail(post.id);
     if(request===epoch.current&&fresh?.id===post.id)setLikeCount(count(fresh.like_count));
    }catch{/* Unknown count stays as a placeholder; liked still reflects the successful mutation. */}
   }
  }catch(error){await fail(error,request,'like');}
  finally{if(request===epoch.current)locks.current.like=false;}
 };
 const send=async()=>{
  const content=draftRef.current.trim();const parent=replyRef.current;
  if(!post||locks.current.send||locks.current.read||!allowed()||!content||(kind==='wall'&&content.length>500))return;
  const original=draftRef.current,request=epoch.current;locks.current.send=true;setSending(true);setNotice(null);
  try{const payload=parent?{content,parent_id:Number(parent.id)}:{content};
   const data=kind==='wall'?await createConfessionComment(post.id,payload):await createComment(post.id,payload);
   if(request!==epoch.current)return;
   const node=comment(data,kind,parent?Number(parent.id):null);
   setNodes(current=>current.some(item=>item.id===node.id)?current:[...current,node]);
   setCommentCount(current=>current===null?null:current+1);
   if(draftRef.current===original&&replyRef.current?.id===parent?.id){setDraft('');setReply(null);}
  }catch(error){await fail(error,request,'send');}
  finally{if(request===epoch.current){locks.current.send=false;setSending(false);}}
 };
 const body=<>
  {notice&&notice!=='login'?<Text role="body">{t(notice==='denied'?'screen.campus.write.denied':notice==='likeFailed'?'screen.campus.write.likeFailed':'screen.campus.write.sendFailed')}</Text>:null}
  {notice==='login'?<Button label={t('screen.campus.write.login')} onPress={()=>router.push('/login')}/>:null}
  <CommentComposer testID="campus-composer" value={draft} onChangeText={setDraft} placeholder={t('screen.campus.write.placeholder')}
   sendLabel={t('screen.campus.write.send')} sending={sending} disabled={pagination.append==='loading'} maxLength={kind==='wall'?500:undefined} onSend={()=>void send()}
   replyContext={reply?(kind==='wall'||reply.author.kind==='anonymous'
    ?{kind:'anonymous',anonymousLabel:t('screen.campus.write.replying'),cancelLabel:t('action.cancel'),onCancel:()=>setReply(null)}
    :{kind:'named',label:t('screen.campus.write.namedReply',{name:reply.author.name}),cancelLabel:t('action.cancel'),onCancel:()=>setReply(null)}):undefined}/>
 </>;
 return {body,report,interactions:{liked,likeCount,commentCount},onToggleLike:()=>void like(),
  comments:{nodes,pagination,onLoadMore:()=>undefined,onRetry:()=>void loadComments(),title:t('screen.campus.read.comments'),
   onReply:(id:string)=>{const node=nodes.find(item=>item.id===id&&item.depth===0);if(node)setReply(node);}}};
}
