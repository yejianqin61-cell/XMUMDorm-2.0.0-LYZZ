import { get } from './request';

/** 贡献榜：range = '30d'（默认）| 'all'；返回 `{ range, list: [{ rank, user:{id,name,avatar,level}, points, contributions }] }` */
export function getContributeLeaderboard(range = '30d') {
  return get(`/api/contribute/leaderboard?range=${encodeURIComponent(range)}`);
}

/** 我的贡献（需登录）：`{ last30d: { points, contributions, rank, byAction }, total: { points, contributions } }` */
export function getMyContribution() {
  return get('/api/contribute/me');
}
