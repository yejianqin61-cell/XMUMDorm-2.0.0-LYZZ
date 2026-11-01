// One synchronous guard shared by all views of one account/target. Reconcile a
// lost response by reading the server, never by issuing an inverse toggle.
export function createFavoriteCoordinator() {
  const busy = new Set();
  return async ({ key, desired, write, read, apply, unavailable }) => {
    if (busy.has(key)) return;
    busy.add(key);
    try {
      const result = await write(desired);
      if (result.favorited !== desired) throw new Error('收藏响应与请求状态不一致，请刷新核对');
      apply(result);
      return result;
    } catch (error) {
      try { apply(await read()); } catch { unavailable(); }
      throw error;
    } finally { busy.delete(key); }
  };
}
