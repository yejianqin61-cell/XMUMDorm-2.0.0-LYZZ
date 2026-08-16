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

      expect(source).toContain('activeTab !== TAB_REVIEWS || reviewsLoaded');
      expect(source).toContain('[isOwnProfile, activeTab, reviewsLoaded, reviewsReloadKey]');
      expect(source).toContain('setReviewsLoaded(false);');
      expect(source).toContain('{snippet(content) || \' \'}');
      expect(source).toContain("className={showTabs && activeTab !== TAB_POSTS ? 'hidden' : undefined}");
      expect(source).toContain("className={activeTab !== TAB_REVIEWS ? 'hidden' : undefined}");
      expect(source).not.toContain("loaded ? 'opacity-100' : 'opacity-0'");
    }
  });
});
