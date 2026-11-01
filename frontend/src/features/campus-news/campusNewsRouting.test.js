import test from 'node:test';
import assert from 'node:assert/strict';
import { campusNewsDemo, findCampusNewsPreview } from './campusNewsDemo.js';
import { campusNewsPreviewPath } from './campusNewsSession.js';

test('preview detail resolves every feed item from the same refresh-safe fixtures', () => {
  for (const post of campusNewsDemo) {
    assert.equal(findCampusNewsPreview(post.id), post);
    assert.match(campusNewsPreviewPath(post.id), /^\/about\/campus\/preview\/demo-news-/);
  }
});

test('real and missing IDs never resolve to a mock detail', () => {
  assert.equal(findCampusNewsPreview('42'), null);
  assert.equal(findCampusNewsPreview('demo-news-missing'), null);
  assert.throws(() => campusNewsPreviewPath(42), /demo news ID/);
});
