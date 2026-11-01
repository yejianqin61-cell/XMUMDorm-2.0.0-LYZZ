import test from 'node:test';
import assert from 'node:assert/strict';
import { squareBannerMode, squareBannerDemo } from './squareBannerPreview.js';

test('production ignores all preview switches and saved modes', () => {
  assert.equal(squareBannerMode(false, '?squareBanners=demo', 'demo'), 'api');
});
test('development mode survives returning home and explicit URL overrides it', () => {
  assert.equal(squareBannerMode(true, ''), 'api');
  assert.equal(squareBannerMode(true, '', 'demo'), 'demo');
  assert.equal(squareBannerMode(true, '', 'api'), 'api');
  assert.equal(squareBannerMode(true, '?squareBanners=demo', 'api'), 'demo');
  assert.equal(squareBannerMode(true, '?squareBanners=api', 'demo'), 'api');
});
test('demo banners use local images and isolated preview detail links', () => {
  assert.equal(squareBannerDemo.length, 3);
  for (const banner of squareBannerDemo) {
    assert.match(banner.image_url, /^\/square\/demo\//);
    assert.match(banner.link_target, /^\/about\/campus\/preview\/demo-news-/);
    assert.equal(banner.type, 'content');
  }
});
