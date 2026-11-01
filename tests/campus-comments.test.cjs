'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {fixture}=require('./helpers/campusCommentMemory.cjs');
process.env.JWT_SECRET='memory-only-comment-cursor-secret';
const make=(f,body={content:'test comment'},key=randomUUID(),user=2,post=15)=>f.service.comment(user,post,body,key);
for(const source of ['news','legacy'])test(`${source}: root, reply, reply-to-reply preserve real target and only two levels`,async()=>{
 const f=fixture();f.state.posts[0].source_kind=source;
 const root=await make(f),reply=await make(f,{content:'reply',reply_to_comment_id:root.id}),nested=await make(f,{content:'nested',reply_to_comment_id:reply.id});
 assert.equal(root.parent_id,null);assert.equal(reply.parent_id,root.id);assert.equal(nested.parent_id,root.id);assert.equal(nested.reply_to.comment_id,reply.id);
 const page=await f.service.comments(2,15,{threads:true});assert.equal(page.items.length,1);assert.equal(page.items[0].replies.length,2);assert.equal(page.comment_count,3);
});
test('cross-post and client root/depth fields cannot construct foreign threads',async()=>{
 const f=fixture(),root=await make(f);await assert.rejects(make(f,{content:'cross',reply_to_comment_id:root.id},randomUUID(),2,16),e=>e.status===404);
 await assert.rejects(make(f,{content:'forged',root_id:root.id,reply_to_comment_id:root.id}),e=>e.status===400);
 await assert.rejects(make(f,{content:'ambiguous',parent_id:root.id,reply_to_comment_id:root.id}),e=>e.status===400);
});
test('same UUID and normalized content replay same ID; changed body/target/post conflict',async()=>{
 const f=fixture(),key=randomUUID(),a=await make(f,{content:'a\r\nb'},key);assert.equal((await make(f,{content:' a\nb '},key)).id,a.id);
 for(const body of [{content:'other'},{content:'a\nb',reply_to_comment_id:a.id}])await assert.rejects(make(f,body,key),e=>e.status===409);
 await assert.rejects(make(f,{content:'a\nb'},key,2,16),e=>e.status===409);assert.equal(f.state.comments.length,1);assert.equal(f.state.receipts.length,1);
});
test('same UUID different actors isolated; concurrent identical requests create once',async()=>{
 const f=fixture(),key=randomUUID();const results=await Promise.all(Array.from({length:8},()=>make(f,{content:'concurrent'},key)));
 assert.equal(new Set(results.map(r=>r.id)).size,1);await make(f,{content:'concurrent'},key,3);assert.equal(f.state.comments.length,2);
});
for(const sqlPart of ['INSERT INTO campus_interaction_requests','SELECT c.*'])test(`failure ${sqlPart} rolls back comment and receipt`,async()=>{
 const f=fixture({fail:s=>s.startsWith(sqlPart)});await assert.rejects(make(f),e=>e.status===503);assert.equal(f.state.comments.length,0);assert.equal(f.state.receipts.length,0);assert.equal(f.stats().rolledBack,1);
});
test('author deletes self; other student rejected; repeat delete unchanged and no duplicate audit',async()=>{
 const f=fixture(),a=await make(f);await assert.rejects(f.service.deleteComment(3,15,a.id),e=>e.status===403);
 const deleted=await f.service.deleteComment(2,15,a.id);assert.equal(deleted.content,null);assert.equal(deleted.changed,true);assert.equal(deleted.comment_count,0);
 assert.equal((await f.service.deleteComment(2,15,a.id)).changed,false);assert.equal(f.state.audit.length,1);
});
test('current DB administrator role and reason required; revoked admin refused',async()=>{
 const f=fixture(),a=await make(f);await assert.rejects(f.service.deleteComment(1,15,a.id),e=>e.status===400);
 f.state.users[0].role='student';await assert.rejects(f.service.deleteComment(1,15,a.id,{reason:'test violation'}),e=>e.status===403);
 f.state.users[0].role='admin';await f.service.deleteComment(1,15,a.id,{reason:'test violation'});assert.equal(f.state.audit[0].action,'CAMPUS_COMMENT_ADMIN_DELETE');assert.equal(f.state.audit[0].meta.post_id,15);
});
test('audit error rolls back deletion; no globally swallowed audit call',async()=>{
 const f=fixture({fail:s=>s.startsWith('INSERT INTO audit_logs')}),a=await make(f);await assert.rejects(f.service.deleteComment(1,15,a.id,{reason:'test'}),e=>e.status===503);
 assert.equal(f.state.comments[0].deleted_at,null);assert.equal(f.state.audit.length,0);
});
test('deleted root preserves replies, deleted body never read/replayed, deleted targets refuse new replies',async()=>{
 const f=fixture(),key=randomUUID(),root=await make(f,{content:'private removed body'},key),reply=await make(f,{content:'surviving reply',reply_to_comment_id:root.id});
 await f.service.deleteComment(2,15,root.id);const page=await f.service.comments(2,15,{threads:true});assert.equal(page.items[0].content,null);assert.equal(page.items[0].replies[0].id,reply.id);assert.equal(page.comment_count,1);
 assert.equal((await make(f,{content:'private removed body'},key)).content,null);
 await assert.rejects(make(f,{content:'new reply',reply_to_comment_id:reply.id}),e=>e.code==='COMMENT_TARGET_DELETED');
 assert.doesNotMatch(JSON.stringify(await f.service.comments(2,15)),/private removed body/);
});
test('deleted reply snapshot preserves reply target identity without removed body',async()=>{
 const f=fixture(),root=await make(f),reply=await make(f,{content:'target secret',reply_to_comment_id:root.id}),next=await make(f,{content:'to reply',reply_to_comment_id:reply.id});
 await f.service.deleteComment(2,15,reply.id);const page=await f.service.comments(2,15,{threads:true});const item=page.items[0].replies.find(c=>c.id===next.id);assert.equal(item.reply_to.is_deleted,true);assert.equal(item.reply_to.display_name,'Test 2');assert.doesNotMatch(JSON.stringify(page),/target secret/);
});
for(const change of [{lifecycle_status:'draft'},{lifecycle_status:'withdrawn'},{hidden_by_admin:1},{deleted_at:'date'},{category:null}])test(`visibility ${JSON.stringify(change)} rejects comments without side effects`,async()=>{
 const f=fixture();Object.assign(f.state.posts[0],change);await assert.rejects(make(f),e=>e.status===404);assert.equal(f.state.comments.length,0);
});
for(const change of [{lifecycle_status:'withdrawn'},{hidden_by_admin:1},{deleted_at:'date'}])test(`memory lock model latest state ${JSON.stringify(change)} checked inside transaction`,async()=>{
 const f=fixture({beforePost:state=>Object.assign(state.posts[0],change)});await assert.rejects(make(f),e=>e.status===404);assert.equal(f.state.receipts.length,0);
});
test('legacy no-key post compatibility; missing reply target metadata is not invented',async()=>{
 const f=fixture();f.state.posts[0].source_kind='legacy';const root=await f.service.comment(2,15,{content:'old'});
 await f.service.comment(2,15,{content:'old reply',parent_id:root.id});Object.assign(f.state.comments[1],{reply_to_comment_id:null,reply_to_user_id:null,reply_to_name:null});
 const array=await f.service.comments(null,15);assert.ok(Array.isArray(array));assert.equal(array[0].replies[0].reply_to,null);assert.equal(f.state.receipts.length,0);
});
test('stable keyset root and reply pages use high watermark; wrong/tampered cursor refused',async()=>{
 const f=fixture();for(let i=0;i<5;i++)await make(f,{content:`root ${i}`});
 const first=await f.service.comments(2,15,{threads:true,limit:2});await make(f,{content:'late root'});
 const second=await f.service.comments(2,15,{threads:true,limit:2,cursor:first.next_cursor});const third=await f.service.comments(2,15,{threads:true,limit:2,cursor:second.next_cursor});
 assert.equal(new Set([...first.items,...second.items,...third.items].map(c=>c.id)).size,5);assert.equal(third.next_cursor,null);
 await assert.rejects(f.service.comments(2,16,{threads:true,cursor:first.next_cursor}),e=>e.status===400);
 await assert.rejects(f.service.comments(2,15,{threads:true,cursor:first.next_cursor+'x'}),e=>e.status===400);
 const root=first.items[0];for(let i=0;i<4;i++)await make(f,{content:`reply ${i}`,reply_to_comment_id:root.id});
 const r1=await f.service.comments(2,15,{rootId:root.id,limit:2}),r2=await f.service.comments(2,15,{rootId:root.id,limit:2,cursor:r1.next_cursor});assert.equal(r1.items.length+r2.items.length,4);
 await assert.rejects(f.service.comments(2,15,{rootId:first.items[1].id,cursor:r1.next_cursor}),e=>e.status===400);
});
test('invalid keys, unsafe content, missing identity and protected fields fail without insertion',async()=>{
 const f=fixture();for(const key of ['bad','', 'a'.repeat(100)])await assert.rejects(make(f,{content:'x'},key),e=>e.status===400);
 for(const content of ['', 'a'.repeat(2001),'text\u0001'])await assert.rejects(make(f,{content}),e=>e.status===400);
 await assert.rejects(make(f,{content:'x',user_id:1}),e=>e.status===400);await assert.rejects(make(f,{content:'x'},randomUUID(),null),e=>e.status===401);assert.equal(f.state.comments.length,0);
});
test('receipt with NULL result fails closed rather than re-creating',async()=>{
 const f=fixture(),key=randomUUID();await make(f,{content:'x'},key);f.state.receipts[0].result_comment_id=null;
 await assert.rejects(make(f,{content:'x'},key),e=>e.code==='COMMENT_RECEIPT_INVALID');assert.equal(f.state.comments.length,1);
});
test('lost COMMIT ack returns unknown; no automatic comment replay',async()=>{
 const f=fixture({failCommit:true});await assert.rejects(make(f),e=>e.code==='CAMPUS_INTERACTION_OUTCOME_UNKNOWN');assert.equal(f.stats().rolledBack,1);
});
test('likes remain independent and counts derive from live comments',async()=>{
 const f=fixture(),a=await make(f);assert.equal((await f.service.setLike(2,15,true)).comment_count,1);assert.equal((await f.service.setLike(2,15,true)).like_count,1);
 await f.service.deleteComment(2,15,a.id);assert.equal((await f.service.interactions(2,15)).comment_count,0);assert.equal((await f.service.setLike(2,15,false)).like_count,0);
});
