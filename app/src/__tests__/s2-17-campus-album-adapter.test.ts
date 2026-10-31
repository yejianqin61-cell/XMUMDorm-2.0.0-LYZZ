/**
 * 阶段A-02 · 相册适配器
 *
 * 只验「端口映射」：读权限 → 需要时请求 → 写入；以及图库可用性。
 * 保存事务的三结果由丙的模块用例负责（本文件不重复测），下载/文件系统不碰。
 */
import {
  createAlbumSaver,
  createAlbumWriter,
  isAlbumAvailable,
  type AlbumPhotoPort,
} from '@/shared/mediaLibrary';

const makePort = (overrides: Partial<AlbumPhotoPort> = {}): AlbumPhotoPort => ({
  isAvailableAsync: jest.fn(async () => true),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  saveToLibraryAsync: jest.fn(async () => undefined),
  ...overrides,
});

describe('相册适配器（阶段A-02）', () => {
  it('已授权：不请求，直接写入一次', async () => {
    const port = makePort();
    const writer = createAlbumWriter(port);
    expect((await writer.getWritePermission()).granted).toBe(true);
    await writer.writeImage('file:///tmp/a.png');
    expect(port.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(port.saveToLibraryAsync).toHaveBeenCalledWith('file:///tmp/a.png');
  });

  it('未授权但可再问：请求一次', async () => {
    const port = makePort({
      getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
    });
    const writer = createAlbumWriter(port);
    const permission = await writer.requestWritePermission();
    expect(permission.granted).toBe(true);
    expect(port.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('永久拒绝不再请求系统授权', async () => {
    const port = makePort({
      getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
    });
    const writer = createAlbumWriter(port);
    expect(await writer.getWritePermission()).toEqual({ granted: false, canAskAgain: false });
    expect(port.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('只申请「仅保存」权限，不请求读取', async () => {
    const port = makePort();
    const writer = createAlbumWriter(port);
    await writer.getWritePermission();
    expect(port.getPermissionsAsync).toHaveBeenCalledWith(true, []);
  });

  it('写入异常向上抛，不吞成成功', async () => {
    const port = makePort({
      saveToLibraryAsync: jest.fn(async () => {
        throw new Error('native write failed');
      }),
    });
    const writer = createAlbumWriter(port);
    await expect(writer.writeImage('file:///tmp/a.png')).rejects.toThrow('native write failed');
  });

  it('图库不可用时明确返回不可用', async () => {
    expect(await isAlbumAvailable(makePort())).toBe(true);
    expect(await isAlbumAvailable(makePort({ isAvailableAsync: jest.fn(async () => false) }))).toBe(
      false
    );
  });

  it('saver 复用同一个 writer：保存链路可用', () => {
    const saver = createAlbumSaver(makePort());
    expect(typeof saver).toBe('function');
  });
});
