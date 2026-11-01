'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { resolveCollege } = require('../services/campusNews/collegeIdentity');
const { Session } = require('../services/campusNews/repository');
const { createNewsService } = require('../services/campusNews/service');
const { filters } = require('../services/campusNews/domain');
test('Profile text, display names and raw IDs cannot become a trusted college ID', () => {
  const colleges = [{id:'stage2-test-college-a',name:'学院A'}];
  for (const value of [null,'学院A','stage2-test-college-a','TEST_ONLY_A']) assert.equal(resolveCollege(value,colleges,true),null);
  assert.equal(resolveCollege('[STAGE2 TEST] college-a',colleges,true),'stage2-test-college-a');
  assert.equal(resolveCollege('[STAGE2 TEST] college-a',colleges,false),null);
  assert.equal(resolveCollege('[STAGE2 TEST] college-a',[],true),null);
});
test('Related filter is derived from current server profile; clients cannot choose another college', async()=>{
  let seen;
  const service = createNewsService({read: async work=>work({admin:async()=>({status:'active',college:'free text'}),colleges:async()=>[],list:async input=>{seen=input;return {items:[]};}})});
  await service.publicFeed(2,{related:'1'}); assert.equal(seen.relatedCollegeId,null); assert.equal(seen.related,true);
  await assert.rejects(service.publicFeed(2,{related:'1',collegeId:'spoof'}),e=>e.status===400);
});
test('Actual SQL uses audience matching only as a related filter and preserves historical chronology',async()=>{
  const calls=[];const session=new Session({execute:async(sql,args)=>{calls.push({sql,args});return [sql.includes('COUNT')?[{total:0}]:[]];}},x=>x);
  await session.list({...filters({related:'1'}),relatedCollegeId:'test-a'},true);
  assert.ok(calls.every(c=>c.sql.includes("audience_scope='all' OR EXISTS")&&c.args.includes('test-a')));
  assert.match(calls[1].sql,/CASE WHEN source_kind='legacy' THEN created_at ELSE COALESCE\(published_at,created_at\) END DESC,id DESC/);
  calls.length=0;await session.list(filters({}),true); assert.ok(calls.every(c=>!c.args.includes('test-a')));
});
test('Administrator college filter is parameterized and independent of category and state',async()=>{
  const calls=[];const session=new Session({execute:async(sql,args)=>{calls.push({sql,args});return [sql.includes('COUNT')?[{total:0}]:[]];}},x=>x);
  await session.list(filters({collegeId:'test-a',category:'lecture',status:'draft'}));
  assert.ok(calls.every(c=>c.args.includes('test-a')&&c.args.includes('lecture')&&c.args.includes('draft')));
  assert.throws(()=>filters({collegeId:'../bad'})); assert.throws(()=>filters({related:'maybe'}));
});
test('Real presentation requires published classified data; previews remain separate',async()=>{
  const {toRealCampusNewsViewModel:present}=await import('../frontend/src/features/campus-news/campusNewsModel.js');
  const post={id:'12',category:'lecture',title:'test',content:'body',sourceKind:'news',lifecycleStatus:'published',hiddenByAdmin:false,deletedAt:null,audience:{scope:'colleges',collegeIds:['stable-id']},images:[],createdAt:'2000-01-01',publishedAt:'2020-01-01'};
  assert.equal(present(post,[{id:'stable-id',name:'Test directory'}]).audience.colleges[0].name,'Test directory');
  assert.equal(present(post).createdAt,'2020-01-01');assert.equal(present({...post,sourceKind:'legacy'}).createdAt,'2000-01-01');
  for(const change of [{id:'demo-news-1'},{category:null},{lifecycleStatus:'draft'},{hiddenByAdmin:true},{deletedAt:'2020-01-01'}]) assert.throws(()=>present({...post,...change}));
  assert.throws(()=>present({...post,images:[{url:'javascript:alert(1)'}]}));
  assert.throws(()=>present({...post,images:[{url:'//unknown.example/image.png'}]}));
});

test('04D public SQL list/detail attach campus counts without persisting them into admin snapshots', async () => {
  const post = id => ({ id, source_kind:'news', lifecycle_status:'published', hidden_by_admin:0, deleted_at:null,
    category:'lecture', audience_scope:'all', author_user_id:2, revision:1, title:'Test', content:'body', created_at:'2026-01-01' });
  const calls = [];
  const session = new Session({ execute: async (sql, args) => {
    calls.push({ sql, args });
    if (sql.startsWith('SELECT COUNT(*) AS total')) return [[{total:2}]];
    if (sql.startsWith('SELECT * FROM campus_posts')) return [[post(args[0] || 15), ...(args.length ? [] : [post(16)])]];
    if (sql.startsWith('SELECT post_id,COUNT') && sql.includes('campus_post_likes')) return [[{post_id:15,cnt:2}]];
    if (sql.startsWith('SELECT post_id,COUNT')) return [[{post_id:15,cnt:1}]];
    if (sql.startsWith('SELECT post_id FROM campus_post_likes')) return [[{post_id:15}]];
    if (sql.includes('FROM users')) return [[{id:2,username:'test',status:'active'}]];
    return [[]];
  } }, x=>x);
  await session.admin(2);
  const page = await session.list(filters({}),true);
  assert.equal(page.items.length,2);assert.equal(page.items[0].interactions.like_count,2);
  assert.equal(page.items[0].interactions.liked,true);assert.equal(page.items[1].interactions.like_count,0);
  assert.equal(calls.filter(c=>c.sql.startsWith('SELECT post_id')).length,3);
  assert.equal((await session.get(15,false,true)).interactions.comment_count,1);
  assert.equal((await session.get(15)).interactions,undefined);
});
