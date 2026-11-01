'use strict';
// Explicit local test runner, never imported by an application entry point.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'.local/stage2/integration-01f');fs.mkdirSync(dir,{recursive:true});
const {readLocalConfig,verifyIdentity}=require('../stage2-db/local-config.cjs');
const {plan,stateAfter,ledgerPrefix}=require('../stage2-db/migrate.cjs');
const {inspectSchema,assertSchema}=require('../stage2-db/schema.cjs');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const save=(name,value)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2));
const credentials=JSON.parse(fs.readFileSync(path.join(root,'.local/stage2/integration-01e/credentials.json'),'utf8'));
let db;const report={checks:[]};const sql=async(q,args=[])=>{const[r]=await db.execute(q,args);return r;};
async function call(label,url,{token,method='GET',body,expected=200}={}){
  assert.ok(url.startsWith('/api/'));
  const res=await fetch(`http://127.0.0.1:4040${url}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data=await res.json();report.checks.push({label,path:url,method,http:res.status});save('results.json',report);
  assert.equal(res.status,expected,label);if(expected===200)assert.equal(data.status,0,label);return data.token?data:data.data??data;
}
async function login(key){const a=credentials[key];return (await call(`login ${key}`,'/api/auth/login',{method:'POST',body:{username:a.username,password:a.password}})).token;}
async function preflight(){assert.equal(plan().hash,'868c8889fd742f70797436ce431fc6f45b57aac58a9a37d5ec5b7103ee230e0d');const identity=await verifyIdentity(db);assertSchema(await inspectSchema(db),stateAfter(plan(),21));assert.equal(ledgerPrefix(await sql('SELECT * FROM stage2_schema_migrations'),plan()),21);return identity;}
async function fixtures(){
  assert.ok(!fs.existsSync(path.join(dir,'fixtures.json')),'Fixtures already exist; do not duplicate');
  const admin=await login('admin'),student=await login('student');
  const previousCollege=(await sql('SELECT college FROM users WHERE id=?',[credentials.student.id]))[0].college;
  const asset=JSON.parse(fs.readFileSync(path.join(root,'.local/stage2/integration-01e/manifest.json'),'utf8')).assetIds[0];
  const ids=[];
  for(let i=0;i<8;i++){
    const audience=i===1?{scope:'colleges',collegeIds:['stage2-test-college-a']}:i===2?{scope:'colleges',collegeIds:['stage2-test-college-b']}:{scope:'all',collegeIds:[]};
    const post=await call(`create real fixture ${i}`,'/api/admin/campus-news/publish',{token:admin,method:'POST',body:{title:`[STAGE2 TEST 01F] 学生接入 ${i}`,content:'真实数据库联调内容。\n换行与完整正文。',category:['competition','lecture','campus-life'][i%3],audience,imageAssetIds:i===0?[asset]:[]}});ids.push(Number(post.id));
  }
  // Exercise the old organization API without changing its permission model.
  const legacy=await call('legacy organization publishes unchanged','/api/square/campus-posts',{token:student,method:'POST',body:{organization_id:1,feed_tab:'school',title:'[STAGE2 TEST 01F] 历史待补录',content:'原组织业务测试内容'}});
  const legacyId=legacy.id;
  await sql("UPDATE campus_posts SET created_at='2020-01-01 00:00:00',published_at='2025-01-01 00:00:00' WHERE id=? AND source_kind='legacy'",[legacyId]);
  save('fixtures.json',{ids,legacyId,previousCollege});
}
async function verify(){
  Object.assign(report,fs.existsSync(path.join(dir,'results.json'))?read('results.json'):report);
  const fixture=read('fixtures.json'),admin=await login('admin'),student=await login('student');
  const studentId=credentials.student.id;
  const all=()=>call('student real feed','/api/campus-news?pageSize=50',{token:student});
  const related=()=>call('server related feed','/api/campus-news?related=1&pageSize=50',{token:student});
  await sql('UPDATE users SET college=NULL WHERE id=?',[studentId]);
  let data=await related();assert.ok(data.items.every(p=>p.audience.scope==='all'));
  await sql('UPDATE users SET college=? WHERE id=?',['stage2-test-college-a',studentId]);
  data=await related();assert.ok(data.items.every(p=>p.audience.scope==='all'));
  await sql('UPDATE users SET college=? WHERE id=?',['[STAGE2 TEST] college-a',studentId]);
  const context=await call('trusted college mapping','/api/campus-news/context',{token:student});assert.equal(context.collegeId,'stage2-test-college-a');
  data=await related();assert.ok(data.items.some(p=>Number(p.id)===fixture.ids[1]));assert.ok(!data.items.some(p=>Number(p.id)===fixture.ids[2]));
  const feed=await all();assert.ok(feed.items.some(p=>Number(p.id)===fixture.ids[2]),'College B still readable in all feed');assert.ok(!feed.items.some(p=>Number(p.id)===fixture.legacyId));
  for(const category of ['competition','lecture','campus-life']){const r=await call(`category ${category}`,`/api/campus-news?category=${category}`,{token:student});assert.ok(r.items.length&&r.items.every(p=>p.category===category));}
  const page1=await call('pagination page1','/api/campus-news?page=1&pageSize=2',{token:student});const page2=await call('pagination page2','/api/campus-news?page=2&pageSize=2',{token:student});assert.equal(page1.items.length,2);assert.ok(!page1.items.some(p=>page2.items.some(q=>q.id===p.id)));
  const adminFiltered=await call('admin combined filters','/api/admin/campus-news?category=lecture&status=published&collegeId=stage2-test-college-a',{token:admin});assert.ok(adminFiltered.items.length&&adminFiltered.items.every(p=>p.category==='lecture'&&p.lifecycleStatus==='published'&&p.audience.collegeIds.includes('stage2-test-college-a')));
  let p=await call('management detail',`/api/admin/campus-news/${fixture.ids[0]}`,{token:admin});
  p=await call('edit visible news',`/api/admin/campus-news/${p.id}`,{token:admin,method:'PUT',body:{title:'[STAGE2 TEST 01F] 学生刷新可见新版本',content:p.content,category:p.category,audience:p.audience,imageAssetIds:p.images.map(i=>i.id),expectedRevision:p.revision}});
  assert.equal((await call('student receives new version',`/api/campus-news/${p.id}`,{token:student})).title,p.title);
  for(const action of ['withdraw','publish','hide','unhide']){
    p=await call(action,`/api/admin/campus-news/${p.id}/${action}`,{token:admin,method:'POST',body:{expectedRevision:p.revision}});
    const visible=['publish','unhide'].includes(action);
    await call(`${action} detail visibility`,`/api/campus-news/${p.id}`,{token:student,expected:visible?200:404});
    await call(`${action} old URL visibility`,`/api/square/campus-posts/${p.id}`,{token:student,expected:visible?200:404});
    assert.equal((await all()).items.some(q=>q.id===p.id),visible);
  }
  await call('anonymous real detail denied',`/api/campus-news/${p.id}`,{expected:401});await call('anonymous old URL denied',`/api/square/campus-posts/${p.id}`,{expected:401});
  let deleted=await call('delete fixture detail',`/api/admin/campus-news/${fixture.ids[7]}`,{token:admin});
  if(!deleted.deletedAt)deleted=await call('soft delete fixture',`/api/admin/campus-news/${deleted.id}`,{token:admin,method:'DELETE',body:{expectedRevision:deleted.revision}});
  await call('deleted real detail',`/api/campus-news/${deleted.id}`,{token:student,expected:404});await call('deleted old URL',`/api/square/campus-posts/${deleted.id}`,{token:student,expected:404});
  await call('old legacy anonymous URL retained',`/api/square/campus-posts/${fixture.legacyId}`);
  let legacy=await call('legacy metadata',`/api/admin/campus-news/${fixture.legacyId}`,{token:admin});
  if(!legacy.category)legacy=await call('manual legacy classification',`/api/admin/campus-news/${legacy.id}/classify`,{token:admin,method:'POST',body:{category:'lecture',audience:{scope:'all',collegeIds:[]},expectedRevision:legacy.revision}});
  const dates=await sql("SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS original FROM campus_posts WHERE id=?",[fixture.legacyId]);assert.equal(dates[0].original,'2020-01-01');
  const final=await all();assert.equal(Number(final.items.at(-1).id),fixture.legacyId,'Historical created_at wins over later published_at');
  assert.equal(final.items.at(-1).effectivePublishedAt,legacy.createdAt);
  report.identity=await preflight();report.fixtures=fixture;report.finalIds=final.items.map(p=>p.id);report.result='PASS';save('results.json',report);console.log(JSON.stringify({result:'PASS',checks:report.checks.length,fixtures:fixture,visibleIds:report.finalIds}));
}
async function finish(){
  Object.assign(report,read('results.json'));const fixture=read('fixtures.json'),student=await login('student');
  const dates=await sql("SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS original FROM campus_posts WHERE id=?",[fixture.legacyId]);assert.equal(dates[0].original,'2020-01-01');
  const final=await call('historical time and stable ID ordering','/api/campus-news?pageSize=50',{token:student});
  assert.equal(Number(final.items.at(-1).id),fixture.legacyId);assert.equal(final.items.at(-1).effectivePublishedAt,final.items.at(-1).createdAt);
  const baseline=await sql('SELECT snapshot FROM campus_news_versions WHERE post_id=? AND revision=0',[fixture.legacyId]);assert.equal(baseline.length,1);
  report.result='PASS';report.finalIds=final.items.map(p=>p.id);report.identity=await preflight();save('results.json',report);console.log(JSON.stringify({result:'PASS',checks:report.checks.length,fixtures:fixture,visibleIds:report.finalIds}));
}
async function snapshot(){
  const tables=Object.keys(plan().schema),counts={};for(const name of tables)counts[name]=Number((await sql(`SELECT COUNT(*) AS n FROM ${name}`))[0].n);
  const users=await sql('SELECT id,username,role,status,college FROM users ORDER BY id');
  assert.equal(users.length,3);assert.equal(users.find(u=>u.id===1).role,'admin');assert.equal(users.find(u=>u.id===3).role,'admin');
  const colleges=await sql('SELECT id,code,is_active FROM colleges');assert.ok(colleges.every(c=>c.is_active===1));
  const posts=await sql('SELECT id,source_kind,lifecycle_status,revision,hidden_by_admin,deleted_at FROM campus_posts ORDER BY id');
  for(const p of posts){
    const versions=await sql('SELECT revision,id FROM campus_news_versions WHERE post_id=? ORDER BY revision',[p.id]);
    assert.equal(versions.length,p.revision+(p.source_kind==='legacy'&&p.revision>0?1:0));
    const audit=await sql('SELECT revision,version_id FROM campus_news_audit WHERE post_id=? ORDER BY revision',[p.id]);assert.equal(audit.length,versions.length);
    versions.forEach((v,i)=>{assert.equal(v.id,audit[i].version_id);assert.equal(v.revision,audit[i].revision);});
  }
  const identity=await preflight();save('final-snapshot.json',{identity,counts,users,colleges,posts});console.log(JSON.stringify({identity,counts,users,colleges,posts}));
}
async function legacyCompat(){
  Object.assign(report,read('results.json'));const fixture=read('fixtures.json');assert.ok(!fixture.legacyCompatId,'Do not duplicate legacy fixtures');
  const admin=await login('admin'),student=await login('student');
  const existing=await sql('SELECT id FROM campus_posts WHERE title=? AND author_user_id=?',['[STAGE2 TEST 01F] 历史图片互动保留',credentials.student.id]);assert.ok(existing.length<=1);
  const old=existing[0]||await call('legacy with existing interactions','/api/square/campus-posts',{token:student,method:'POST',body:{organization_id:1,feed_tab:'school',title:'[STAGE2 TEST 01F] 历史图片互动保留',content:'人工补录前已存在图片、点赞与评论'}});
  const id=old.id;
  if(!existing.length){await sql('INSERT INTO campus_post_images(post_id,file_path,sort_order) VALUES(?,?,0)',[id,'/default-avatar.svg']);await sql('INSERT INTO campus_post_likes(post_id,user_id) VALUES(?,?)',[id,credentials.student.id]);await sql('INSERT INTO campus_post_comments(post_id,user_id,content) VALUES(?,?,?)',[id,credentials.student.id,'[STAGE2 TEST 01F] 补录前历史评论']);}
  const comment={insertId:(await sql('SELECT id FROM campus_post_comments WHERE post_id=?',[id]))[0].id};
  const before=(await sql('SELECT id,author_user_id,organization_id,created_at,feed_tab FROM campus_posts WHERE id=?',[id]))[0];
  if(!existing.length)await call('manual classification preserves old identity',`/api/admin/campus-news/${id}/classify`,{token:admin,method:'POST',body:{category:'campus-life',audience:{scope:'all',collegeIds:[]},expectedRevision:0}});
  assert.deepEqual((await sql('SELECT id,author_user_id,organization_id,created_at,feed_tab FROM campus_posts WHERE id=?',[id]))[0],before);
  const detail=await call('old detail retains image and interaction counts',`/api/square/campus-posts/${id}`,{token:student});assert.equal(detail.like_count,1);assert.equal(detail.comment_count,1);assert.equal(detail.images.length,1);assert.equal(detail.images[0].url,'/uploads/default-avatar.svg');
  assert.equal((await sql('SELECT file_path FROM campus_post_images WHERE post_id=?',[id]))[0].file_path,'/default-avatar.svg');
  assert.equal((await sql('SELECT id FROM campus_post_comments WHERE post_id=?',[id]))[0].id,comment.insertId);
  const unclassified=await call('leave unclassified historical fixture','/api/square/campus-posts',{token:student,method:'POST',body:{organization_id:1,feed_tab:'school',title:'[STAGE2 TEST 01F] 未补录不得进入快讯流',content:'保留旧业务与原详情URL'}});
  const feed=await call('classified legacy included, unclassified legacy excluded','/api/campus-news?pageSize=50',{token:student});assert.ok(feed.items.some(p=>Number(p.id)===id));assert.ok(!feed.items.some(p=>Number(p.id)===unclassified.id));
  fixture.legacyCompatId=id;fixture.unclassifiedId=unclassified.id;fixture.legacyCommentId=comment.insertId;save('fixtures.json',fixture);report.legacyCompat={id,unclassifiedId:unclassified.id,commentId:comment.insertId,result:'PASS'};save('results.json',report);console.log(JSON.stringify(report.legacyCompat));
}
async function browserStep(){
  Object.assign(report,read('results.json'));
  const action=process.argv[3]; const fixture=read('fixtures.json');
  if(['disable-test-college','restore-test-college'].includes(action)){
    await sql('UPDATE colleges SET is_active=? WHERE id=? AND code=?',[action==='disable-test-college'?0:1,'stage2-test-college-b','TEST_ONLY_B']);console.log(action);return;
  }
  if(['revoke-test-admin','restore-test-admin'].includes(action)){
    await sql('UPDATE users SET role=? WHERE id=1 AND username=?',[action==='revoke-test-admin'?'student':'admin','stage2_test_admin_01e']);console.log(action);return;
  }
  assert.ok(['update','withdraw','publish','hide','unhide','delete'].includes(action));
  const token=await login('admin'),id=action==='delete'?fixture.ids[6]:fixture.ids[0];
  const post=await call('browser step detail',`/api/admin/campus-news/${id}`,{token});
  const body=action==='update'?{title:'[STAGE2 TEST 01F] 浏览器刷新读取管理员新内容',content:post.content,category:post.category,audience:post.audience,imageAssetIds:post.images.map(i=>i.id),expectedRevision:post.revision}:{expectedRevision:post.revision};
  const result=await call(`browser step ${action}`,`/api/admin/campus-news/${id}${['update','delete'].includes(action)?'':`/${action}`}`,{token,method:action==='update'?'PUT':action==='delete'?'DELETE':'POST',body});
  console.log(JSON.stringify({action,id,resultStatus:result.lifecycleStatus,revision:result.revision}));
}
async function main(){require('./network.cjs')([3306,4040]);db=await require('mysql2/promise').createConnection(readLocalConfig());try{report.identity=await preflight();if(process.argv[2]==='fixtures')await fixtures();else if(process.argv[2]==='verify')await verify();else if(process.argv[2]==='finish')await finish();else if(process.argv[2]==='browser-step')await browserStep();else if(process.argv[2]==='snapshot')await snapshot();else if(process.argv[2]==='legacy-compat')await legacyCompat();else throw Error('Explicit fixtures|verify|finish|browser-step|snapshot|legacy-compat required');}finally{await db.end();}}
main().catch(e=>{console.error('Local integration stopped:',e.code||e.message);console.error(String(e.stack).split('\n').filter(l=>/^\s+at /.test(l)).join('\n'));process.exitCode=1;});
