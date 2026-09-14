const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..', '..', 'frontend-app', 'src');
const webRoot = path.resolve(__dirname, '..', '..', 'frontend', 'src');

describe('MyZone review and favorite counts', () => {
  it.each([appRoot, webRoot])('binds cached counts to the current user in %s', (root) => {
    const source = fs.readFileSync(path.join(root, 'pages', 'MyZone.jsx'), 'utf8');

    expect(source).toContain("['myzone', 'reviewsCount', userId]");
    expect(source).toContain("['myzone', 'favoritesCount', userId]");
  });

  it.each([appRoot, webRoot])('refreshes counts after review and favorite changes in %s', (root) => {
    const detail = fs.readFileSync(path.join(root, 'pages', 'FoodDetail.jsx'), 'utf8');
    const publish = fs.readFileSync(path.join(root, 'pages', 'FoodReviewPublish.jsx'), 'utf8');

    expect(detail).toContain("invalidateQueries({ queryKey: ['myzone', 'favoritesCount'] })");
    expect(detail).toContain("invalidateQueries({ queryKey: ['myzone', 'reviewsCount'] })");
    expect(publish).toContain("invalidateQueries({ queryKey: ['myzone', 'reviewsCount'] })");
  });
});
