/**
 * 排行榜 API，与后端 /api/canteen/rankings/* 对应
 */
import { get } from './request';

export function getRankingsHotProducts() {
  return get('/api/canteen/rankings/hot-products');
}

export function getRankingsBusyShops() {
  return get('/api/canteen/rankings/busy-shops');
}

export function getRankingsTopShops() {
  return get('/api/canteen/rankings/top-shops');
}

export function getRankingsNewHitProducts() {
  return get('/api/canteen/rankings/new-hit-products');
}

export function getRankingsActiveUsers() {
  return get('/api/canteen/rankings/active-users');
}
