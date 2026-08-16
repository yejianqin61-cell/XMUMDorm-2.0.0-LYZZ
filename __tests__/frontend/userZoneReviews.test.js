const fs = require('fs');
const path = require('path');

const userZoneFiles = [
  'frontend-app/src/pages/UserZone.jsx',
  'frontend/src/pages/UserZone.jsx',
];

describe('personal-space review tab', () => {
  it('loads reviews only after the own-profile review tab becomes active and can retry', () => {
    for (const relativePath of userZoneFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');

      expect(source).toContain('if (!isOwnProfile || activeTab !== TAB_REVIEWS) return;');
      expect(source).toContain('[isOwnProfile, activeTab, reviewsReloadKey]');
      expect(source).toContain('onActionClick={() => setReviewsReloadKey((key) => key + 1)}');
      expect(source).toContain('{snippet(content) || \' \'}');
    }
  });
});
