import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnPath, loginPath, loginReturnTarget } from './loginReturn.js';

test('full internal target survives encoded login URL and reload without router state', () => {
  for (const target of ['/about/campus/37?ref=share&filter=a%20b#campus-news-comments', '/materials/file?path=a%2Fb.pdf', '/eat?search=中文', '/eat?q=100%25&next=https%3A%2F%2Fexample.test', '/']) {
    const url = new URL(loginPath(target), 'https://local.test');
    assert.equal(loginReturnTarget({ search: url.search }), safeReturnPath(target));
  }
});
test('legacy router state remains compatible and preserves hash', () => {
  assert.equal(loginReturnTarget({ state: { from: { pathname: '/post/2', search: '?tag=food', hash: '#reply' } } }), '/post/2?tag=food#reply');
  assert.equal(loginReturnTarget({}), '/');
});
test('reject external redirects, encoding bypasses, auth loops and malformed input', () => {
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/a\\b', '/%2fevil.test', '/%252fevil.test', '/%5cevil.test', '/%255cevil.test', '/\nevil.test', '/%0devil.test', '/a/..//evil.test', '/login', '/register?x=1', '/reset-password', '/%6cogin', '/x/../login', '/%', 'javascript:alert(1)', null, {}]) {
    // A normalized same-origin double slash must not leave this validator.
    assert.equal(safeReturnPath(path), null, String(path));
  }
  assert.equal(loginReturnTarget({search:'?returnTo=https://evil.test',state:{from:'/post/1'}}), '/');
});
