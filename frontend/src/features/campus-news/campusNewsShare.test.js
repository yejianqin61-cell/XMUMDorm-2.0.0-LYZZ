import test from 'node:test';
import assert from 'node:assert/strict';
import { campusNewsShareUrl, copyCampusNewsLink } from './campusNewsShare.js';

test('share builds a canonical absolute detail URL with no credentials or feed query', () => {
  assert.equal(campusNewsShareUrl('37', 'https://campus.test'), 'https://campus.test/about/campus/37');
  assert.equal(campusNewsShareUrl(37, 'http://127.0.0.1:5173'), 'http://127.0.0.1:5173/about/campus/37');
  for (const id of ['demo-news-1', '0', '../login', '37?x=1']) assert.throws(() => campusNewsShareUrl(id, 'https://campus.test'));
});
test('clipboard success, denied permission and unsupported browser are distinct outcomes', async () => {
  let copied;
  await copyCampusNewsLink(37, 'https://campus.test', { writeText: async text => { copied = text; } });
  assert.equal(copied, 'https://campus.test/about/campus/37');
  await assert.rejects(copyCampusNewsLink(37, 'https://campus.test', {writeText:async()=>{throw new Error('Denied');}}), /Denied/);
  await assert.rejects(copyCampusNewsLink(37, 'https://campus.test', undefined), /unavailable/);
});
