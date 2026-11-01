'use strict';
const {createCampusInteractions}=require('../../services/campusInteractions');
function fixture(options={}){
 const state={users:[{id:1,role:'admin',status:'active'},{id:2,role:'student',status:'active'},{id:3,role:'student',status:'active'}],
 posts:[15,16].map(id=>({id,source_kind:'news',lifecycle_status:'published',hidden_by_admin:0,deleted_at:null,category:'lecture',audience_scope:'all'})),comments:[],receipts:[],audit:[],likes:[],...options.state};
 let tail=Promise.resolve();const log=[];let committed=0,rolledBack=0;
 const pool={async getConnection(){let data,release;return {
 async beginTransaction(){log.push('BEGIN');},
 async execute(sql,p=[]){log.push([sql,p]);if(options.fail?.(sql))throw new Error('injected SQL failure');
 if(sql.startsWith('SELECT id,role,status FROM users'))return [state.users.filter(u=>u.id===p[0]).map(u=>({...u}))];
 if(sql.startsWith('SELECT id,source_kind')){const prior=tail;tail=new Promise(r=>release=r);await prior;await options.beforePost?.(state);data=structuredClone(state);return [data.posts.filter(r=>r.id===p[0])];}
 const c=data.comments;
 if(sql.startsWith('SELECT college_id'))return [[{college_id:1}]];
 if(sql.startsWith('SELECT id FROM campus_post_comments'))return [c.filter(r=>r.post_id===p[0]&&r.id===p[1]).map(r=>({id:r.id}))];
 if(sql.startsWith('SELECT operation,post_id'))return [data.receipts.filter(r=>r.actor_id===p[0]&&r.request_key===p[1])];
 if(sql.startsWith('SELECT COALESCE(MAX'))return [[{max_id:Math.max(0,...c.filter(r=>r.post_id===p[0]).map(r=>r.id))}]];
 if(sql.startsWith('SELECT id,deleted_at'))return [c.filter(r=>r.post_id===p[0]&&p.slice(1).includes(r.id)).map(r=>({id:r.id,deleted_at:r.deleted_at}))];
 if(sql.startsWith('SELECT COUNT'))return [[{cnt:c.filter(r=>r.post_id===p[0]&&!r.deleted_at&&(p.length===1||r.parent_id===p[1])).length}]];
 if(sql.startsWith('SELECT post_id,COUNT'))return [p.map(post_id=>({post_id,cnt:sql.includes('campus_post_likes')?data.likes.filter(r=>r.post_id===post_id).length:c.filter(r=>r.post_id===post_id&&!r.deleted_at).length}))];
 if(sql.startsWith('SELECT post_id FROM campus_post_likes'))return [data.likes.filter(r=>r.user_id===p.at(-1)&&p.slice(0,-1).includes(r.post_id))];
 if(sql.startsWith('SELECT 1 FROM campus_post_likes'))return [data.likes.filter(r=>r.post_id===p[0]&&r.user_id===p[1])];
 if(sql.startsWith('INSERT INTO campus_post_likes')){data.likes.push({post_id:p[0],user_id:p[1]});return [{affectedRows:1}];}
 if(sql.startsWith('DELETE FROM campus_post_likes')){data.likes=data.likes.filter(r=>r.post_id!==p[0]||r.user_id!==p[1]);return [{affectedRows:1}];}
 if(sql.startsWith('SELECT c.*')){
 let rows=c.filter(r=>r.post_id===p[0]);
 if(sql.includes('c.id=?'))rows=rows.filter(r=>r.id===p[1]);
 if(sql.includes('c.id<=?')){
 rows=rows.filter(r=>r.id<=p[1]);let at=2;
 if(sql.includes('c.parent_id IS NULL'))rows=rows.filter(r=>r.parent_id==null&&(!r.deleted_at||c.some(ch=>ch.parent_id===r.id&&!ch.deleted_at&&ch.post_id===r.post_id)));
 else if(sql.includes('c.parent_id=?')){const parentId=p[at++];rows=rows.filter(r=>r.parent_id===parentId);}
 if(sql.includes('c.created_at>?')){const time=new Date(p[at]).getTime(),last=p[at+2];rows=rows.filter(r=>new Date(r.created_at).getTime()>time||(new Date(r.created_at).getTime()===time&&r.id>last));}
 }
 rows=rows.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||a.id-b.id);const limit=sql.match(/LIMIT (\d+)/);if(limit)rows=rows.slice(0,Number(limit[1]));
 return [rows.map(r=>({...r,username:r.user_id==null?null:'Test '+r.user_id,nickname:null,avatar:null}))];}
 if(sql.startsWith('INSERT INTO campus_post_comments')){const r={id:Math.max(0,...c.map(x=>x.id))+1,post_id:p[0],user_id:p[1],parent_id:p[2],content:p[3],reply_to_comment_id:p[4],reply_to_user_id:p[5],reply_to_name:p[6],created_at:'2026-10-28T00:00:00.000Z',deleted_at:null};c.push(r);await options.afterWrite?.(state);return [{affectedRows:1,insertId:r.id}];}
 if(sql.startsWith('INSERT INTO campus_interaction_requests')){if(data.receipts.some(r=>r.actor_id===p[0]&&r.request_key===p[1]))throw Object.assign(new Error('Duplicate PRIMARY'),{code:'ER_DUP_ENTRY'});data.receipts.push({actor_id:p[0],request_key:p[1],operation:p[2],post_id:p[3],payload_sha256:p[4],result_comment_id:p[5]});return [{affectedRows:1}];}
 if(sql.startsWith('UPDATE campus_post_comments')){const r=c.find(r=>r.id===p[0]&&r.post_id===p[1]&&!r.deleted_at);if(r)r.deleted_at='2026-10-28T01:00:00.000Z';return [{affectedRows:r?1:0}];}
 if(sql.startsWith('INSERT INTO audit_logs')){data.audit.push({user_id:p[0],role:p[1],action:p[2],target_type:p[3],target_id:p[4],meta:JSON.parse(p[5])});return [{affectedRows:1}];}
 throw new Error('Unmodelled SQL: '+sql);
 },async commit(){if(options.failCommit)throw Error('unknown commit');Object.assign(state,data);committed++;},async rollback(){rolledBack++;},release(){release?.();},destroy(){release?.();}};}};
 const service=createCampusInteractions({pool,cleanText:s=>String(s??'').trim(),mapAuthor:r=>({id:r.user_id,name:r.nickname||r.username||'用户已不可用',avatar:r.avatar})});
 Object.defineProperties(state,{post:{get:()=>state.posts[0]},user:{get:()=>state.users[1]}});
 return {state,service,pool,log,stats:()=>({committed,rolledBack})};
}
module.exports={fixture};
