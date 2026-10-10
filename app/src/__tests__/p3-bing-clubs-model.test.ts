import {readClubPage, readClubProfile} from '@/features/clubs/model';

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

it('读取社团主页时保留服务端权限布尔值', () => {
  expect(readClubProfile({
    id: 7,
    basicInfo: {id: 7, name: 'Music Club', avatar: null, category: 'music', description: 'Live', followers: 12,
      viewer: {following: true, canManage: false, isMember: true}},
    joinInfo: {contactText: '', signupLink: '', ig: '', xhs: ''},
    members: [{id: 9, role: 'member', email: 'member@example.test', username: 'member', nickname: 'Member', avatar: null}],
    activities: [], posts: [],
  })).toMatchObject({
    id: 7,
    basicInfo: {viewer: {following: true, canManage: false, isMember: true}},
    members: [{id: 9, role: 'member'}],
  });
});

it('拒绝主页中伪造的权限或未知成员角色', () => {
  const base = {
    id: 7,
    basicInfo: {id: 7, name: 'Music Club', avatar: null, category: 'music', description: 'Live', followers: 12,
      viewer: {following: true, canManage: false, isMember: true}},
    joinInfo: {contactText: '', signupLink: '', ig: '', xhs: ''},
    members: [{id: 9, role: 'member', email: 'member@example.test', username: 'member', nickname: 'Member', avatar: null}],
    activities: [], posts: [],
  };
  expect(() => readClubProfile({...base, basicInfo: {...base.basicInfo, viewer: {...base.basicInfo.viewer, canManage: 'yes'}}})).toThrow('Invalid club profile');
  expect(() => readClubProfile({...base, members: [{...base.members[0], role: 'owner'}]})).toThrow('Invalid club profile');
});

it('读取活动详情时保留服务端报名和互动事实', () => {
  const {readClubActivityDetail} = require('@/features/clubs/model');
  expect(readClubActivityDetail({
    id: 12, title: 'Welcome', tag: null, summary: 'Meet us', cover: null, images: ['https://cdn.test/a.jpg'],
    time: '2099-01-02T10:00:00.000Z', endTime: '2099-01-02T12:00:00.000Z', location: 'Hall', clubId: 7, clubName: 'Music',
    status: 'upcoming', signupLink: null,
    registration: {count: 23, registered: true, deadline: '2099-01-02T12:00:00.000Z'},
    stats: {likes: 3, views: 5, comments: 2}, viewer: {liked: true, canManage: false},
  })).toMatchObject({id: 12, registration: {count: 23, registered: true}, viewer: {liked: true, canManage: false}});
});

it('拒绝详情里伪造的统计、报名和权限字段', () => {
  const {readClubPostDetail} = require('@/features/clubs/model');
  expect(() => readClubPostDetail({
    id: 12, clubId: 7, clubName: 'Music', title: '', content: 'hello', images: [], createdAt: 'now',
    stats: {likes: -1, views: 5, comments: 2}, viewer: {liked: false, canManage: false},
  })).toThrow('Invalid club content detail');
});
