/**
 * 超轻量 TTL 缓存（进程内）
 * - 适合 tags/regions/rankings 这种读多写少接口
 * - 支持并发去重：同一个 key 同时只会跑一次 loader
 *
 * 注意：这是“单实例缓存”。如果你 Railway 开了多实例，建议换成 Redis。
 */
class SimpleCache {
  constructor() {
    this.store = new Map(); // key -> { expiresAt, value, pending }
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key, value, ttlMs) {
    const expiresAt = Date.now() + Math.max(1, Number(ttlMs) || 1);
    this.store.set(key, { expiresAt, value, pending: null });
    return value;
  }

  delete(key) {
    this.store.delete(key);
  }

  async getOrSet(key, ttlMs, loader) {
    const hit = this.store.get(key);
    const now = Date.now();
    if (hit && hit.expiresAt > now && hit.value !== undefined) return hit.value;
    if (hit && hit.pending) return hit.pending;

    const pending = (async () => {
      const value = await loader();
      this.set(key, value, ttlMs);
      return value;
    })().finally(() => {
      const cur = this.store.get(key);
      if (cur && cur.pending) cur.pending = null;
    });

    this.store.set(key, { expiresAt: now + Math.max(1, Number(ttlMs) || 1), value: undefined, pending });
    return pending;
  }
}

module.exports = {
  SimpleCache,
  simpleCache: new SimpleCache(),
};

