// One in-flight intent per viewer/campus target, shared by feed and detail.
// No automatic retries, optimistic counts, inverse requests or toggle fallback.
export function createLikeCoordinator() {
  const busy = new Set();
  return async function run({ key, desired, write, read, apply, unavailable }) {
    if (busy.has(key)) return;
    busy.add(key);
    try {
      const result = await write(desired);
      if (result.liked !== desired) throw new Error('点赞响应与请求状态不一致，请刷新核对');
      apply(result);
      return result;
    } catch (error) {
      try { apply(await read()); }
      catch { unavailable(); }
      throw error;
    } finally { busy.delete(key); }
  };
}
