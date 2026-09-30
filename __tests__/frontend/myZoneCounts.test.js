const fs = require('fs');
const path = require('path');

// App 客户端（旧 frontend-app）已全盘废弃并移出工作区（归档 tag app-legacy-v1），
// 这里只守剩下的 Web 端 frontend/src。
const webRoot = path.resolve(__dirname, '..', '..', 'frontend', 'src');

describe('MyZone review and favorite counts (Web)', () => {
  it('binds cached counts to the current user', () => {
    const source = fs.readFileSync(path.join(webRoot, 'pages', 'MyZone.jsx'), 'utf8');

    expect(source).toContain("['myzone', 'reviewsCount', userId]");
    expect(source).toContain("['myzone', 'favoritesCount', userId]");
  });

  it('refreshes counts after review and favorite changes', () => {
    const detail = fs.readFileSync(path.join(webRoot, 'pages', 'FoodDetail.jsx'), 'utf8');
    const publish = fs.readFileSync(path.join(webRoot, 'pages', 'FoodReviewPublish.jsx'), 'utf8');

    expect(detail).toContain("invalidateQueries({ queryKey: ['myzone', 'favoritesCount'] })");
    expect(detail).toContain("invalidateQueries({ queryKey: ['myzone', 'reviewsCount'] })");
    expect(publish).toContain("invalidateQueries({ queryKey: ['myzone', 'reviewsCount'] })");
  });
});
