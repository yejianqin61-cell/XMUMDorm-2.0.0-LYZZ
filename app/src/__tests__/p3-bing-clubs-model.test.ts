import {readClubPage} from '@/features/clubs/model';

const row = {
  id: 7,
  name: 'Music Club',
  category: 'music',
  description: 'Live performances',
  avatar: null,
  followers: 12,
  viewer: {following: false},
};

describe('社团发现领域模型', () => {
  it('接受服务端分类分页与关注状态', () => {
    expect(readClubPage({list: [row], page: 1, pageSize: 10, hasMore: false})).toEqual({
      rows: [row], hasMore: false,
    });
  });

  it('拒绝未知分类、缺失关注状态与伪分页', () => {
    expect(() => readClubPage({list: [{...row, category: 'unknown'}], page: 1, pageSize: 10, hasMore: false})).toThrow('Invalid club page');
    expect(() => readClubPage({list: [{...row, viewer: {}}], page: 1, pageSize: 10, hasMore: false})).toThrow('Invalid club page');
    expect(() => readClubPage({list: [row], page: 0, pageSize: 10, hasMore: false})).toThrow('Invalid club page');
  });
});
