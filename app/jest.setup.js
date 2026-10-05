/**
 * Jest 全局替身（P1-02 / P1-13）
 *
 * 依赖在 Jest 里跑不起来（原生桥 / 原生模块），用它们**官方自带**的 mock：
 *   - AsyncStorage —— 需要一个内存实现
 *   - NetInfo      —— 需要可控的连通性状态
 * ⛔ 不自己手写 mock 顶替官方 mock：官方 mock 跟着版本走，自写的会过期且失真。
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock')
);

/**
 * `expo-secure-store`（P1-13）：**该包没有自带 jest mock**（实测 `57.0.4`，
 * 目录里没有任何 `*mock*` 文件），而它的方法全走原生桥 → 不 mock 会直接崩。
 * 所以这里给一个**内存实现**，行为与原生一致到"够用"：
 *   · `getItemAsync` 读不到返回 `null`（原生语义）
 *   · `deleteItemAsync` 删不存在的 key **不抛**
 * ⚠️ 与官方 mock 的区别已在此写明：这是我们**唯一**自写的替身，因为它没有官方的。
 */
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __store: store,
    isAvailableAsync: jest.fn(async () => true),
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, String(value));
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});
