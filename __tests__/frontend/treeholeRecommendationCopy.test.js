const fs = require('fs');
const path = require('path');

// App 客户端（旧 frontend-app）已全盘废弃并移出工作区（归档 tag app-legacy-v1），
// 这里只检查 Web 端的同名组件。
const treeholeCopyFiles = [
  'frontend/src/components/square/InterestRecommendationBlock.jsx',
  'frontend/src/components/square/RelatedCampusTopicsBlock.jsx',
];

const unsupportedRecommendationCopy = [
  '继续沿着你的兴趣看',
  '和你的校园身份更相关',
  'For You',
  'Campus Pulse',
  'Keep exploring your interests',
  'More relevant to your campus identity',
];

describe('treehole recommendation copy', () => {
  it('does not expose unsupported personalization claims', () => {
    for (const relativePath of treeholeCopyFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');
      for (const phrase of unsupportedRecommendationCopy) {
        expect(source).not.toContain(phrase);
      }
      expect(source).not.toContain('item.reason');
    }
  });
});
