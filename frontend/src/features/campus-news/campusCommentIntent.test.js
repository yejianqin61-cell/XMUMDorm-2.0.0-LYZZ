import test from 'node:test';
import assert from 'node:assert/strict';
import {commentIntent,loadCommentIntent,finishCommentIntent} from './campusCommentIntent.js';
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('unknown network result reuses original UUID/body across refresh',()=>{
 const s=storage(),body={content:'same',reply_to_comment_id:'10'};
 const first=commentIntent(s,'campus:2:15',body,()=> 'original-uuid');
 assert.deepEqual(loadCommentIntent(s,'campus:2:15'),first);
 assert.equal(commentIntent(s,'campus:2:15',body,()=>assert.fail()).key,first.key);
 assert.throws(()=>commentIntent(s,'campus:2:15',{content:'different'}),/尚待核对/);
});
test('confirmed success clears only matching pending intent; next deliberate submit has new UUID',()=>{
 const s=storage();commentIntent(s,'a',{content:'x'},()=> 'one');finishCommentIntent(s,'a','other');assert.ok(loadCommentIntent(s,'a'));
 finishCommentIntent(s,'a','one');assert.equal(loadCommentIntent(s,'a'),null);assert.equal(commentIntent(s,'a',{content:'x'},()=> 'two').key,'two');
});
test('different viewers/targets isolate pending state; storage failure blocks before network',()=>{
 const s=storage();commentIntent(s,'2:15',{content:'x'},()=> 'one');assert.equal(loadCommentIntent(s,'3:15'),null);assert.equal(loadCommentIntent(s,'2:16'),null);
 assert.throws(()=>commentIntent({getItem:()=>null,setItem:()=>{throw Error('quota');}},'x',{content:'x'}),/quota/);
});
test('corrupt receipt is not silently discarded and retried with a fresh key',()=>{
 const s=storage();s.setItem('a','bad');assert.throws(()=>loadCommentIntent(s,'a'));assert.equal(s.getItem('a'),'bad');
});
