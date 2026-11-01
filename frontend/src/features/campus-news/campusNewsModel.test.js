import test from 'node:test';
import assert from 'node:assert/strict';
import { toCampusNewsViewModel, normalizeAudience, audienceFromCollegeIds } from './campusNewsModel.js';

test('legacy school/college values are not silently treated as content categories', () => {
  for (const category of ['school', 'college']) {
    assert.throws(() => toCampusNewsViewModel({ category }), /Unknown campus news category/);
  }
});

test('presentation boundary limits images and normalizes missing interaction state', () => {
  const source = { id: 'demo-case', category: 'lecture', audience: { scope: 'all', collegeCodes: [] }, title: '中英 Test', images: Array.from({ length: 12 }, (_, i) => i).map((i) => ({ src: `/${i}.png` })), likeCount: -3 };
  const result = toCampusNewsViewModel(source);
  assert.equal(result.images.length, 10);
  assert.equal(source.images.length, 12);
  assert.equal(result.likeCount, 0);
  assert.equal(result.favoriteCount, 0);
  assert.equal(result.liked, false);
  assert.equal(result.title, '中英 Test');
});


test('audience enforces exclusivity and stable college codes', () => {
  assert.throws(() => normalizeAudience({ scope: 'all', collegeCodes: ['computing'] }), /mutually exclusive/);
  assert.throws(() => normalizeAudience({ scope: 'colleges', collegeCodes: [] }), /empty/);
  assert.throws(() => normalizeAudience({ scope: 'college' }), /scope/);
  assert.deepEqual(normalizeAudience({ scope: 'colleges', collegeCodes: ['computing', 'computing'] }), { scope: 'colleges', collegeCodes: ['computing'] });
});

test('college IDs are translated only through an explicit team-owned mapping', () => {
  assert.deepEqual(audienceFromCollegeIds([42], { '42': 'computing' }), { scope: 'colleges', collegeCodes: ['computing'] });
  assert.throws(() => audienceFromCollegeIds([99], {}), /Unknown/);
});
