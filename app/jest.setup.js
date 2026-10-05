/**
 * Jest 全局替身（P1-02）
 *
 * 三个依赖在 Jest 里跑不起来（原生桥 / 原生模块），用它们**官方自带**的 mock：
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
