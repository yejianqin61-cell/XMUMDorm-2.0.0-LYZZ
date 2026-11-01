import test from 'node:test';
import assert from 'node:assert/strict';
import { deletionReason } from './campusCommentDeletion.js';
test('self deletion accepts server string IDs and needs no moderator reason',()=>{
  assert.equal(deletionReason({user_id:'2'},{id:2},''),null);
});
test('deleting another author requires a nonblank moderator reason before confirmation',()=>{
  for(const value of ['',null,'   '])assert.throws(()=>deletionReason({user_id:'2'},{id:1},value),/删除原因/);
  assert.equal(deletionReason({user_id:'2'},{id:1},' test reason '),'test reason');
});
test('reason length uses Unicode code points, including non-BMP text',()=>{
  assert.equal([...deletionReason({user_id:'2'},{id:1},'🙂'.repeat(500))].length,500);
  assert.throws(()=>deletionReason({user_id:'2'},{id:1},'🙂'.repeat(501)),/删除原因/);
});
