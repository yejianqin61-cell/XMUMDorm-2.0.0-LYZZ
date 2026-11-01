// The intent is persisted before sending. Unknown outcomes reuse exactly this key/body.
export function loadCommentIntent(storage, scope) {
  const raw=storage.getItem(scope);
  if(!raw)return null;
  const value=JSON.parse(raw);
  if(typeof value.key!=='string'||typeof value.body?.content!=='string')throw new Error('待核对评论记录无效，请保留记录并联系支持');
  return value;
}
export function commentIntent(storage,scope,body,uuid=()=>crypto.randomUUID()) {
  const previous=loadCommentIntent(storage,scope);
  if(previous){if(JSON.stringify(previous.body)!==JSON.stringify(body))throw new Error('上一条评论结果尚待核对，请先用原内容重试');return previous;}
  const value={key:uuid(),body};storage.setItem(scope,JSON.stringify(value));return value;
}
export function finishCommentIntent(storage,scope,key) {
  if(loadCommentIntent(storage,scope)?.key===key)storage.removeItem(scope);
}
