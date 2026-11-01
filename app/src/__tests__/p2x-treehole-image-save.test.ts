import { createTreeholeImageSaver, type TreeholeAlbumWriter } from '@/features/campus/treeholeImageSave';

const mockDownload = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockDirectories: string[] = [];
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  Directory: class {
    uri: string;
    exists = true;
    constructor(...parts: string[]) { this.uri = parts.join('/'); mockDirectories.push(this.uri); }
    create = mockCreate;
    delete = mockDelete;
  },
  File: { downloadFileAsync: (...args: unknown[]) => mockDownload(...args) },
}));

const remote = 'https://assets.example.test/posts/photo.png?signature=abc';
const local = { uri: 'file:///cache/save/photo.png', extension: '.png', exists: true, size: 64 };
let writer: TreeholeAlbumWriter;
beforeEach(() => {
  mockDownload.mockReset().mockResolvedValue(local);
  mockCreate.mockReset(); mockDelete.mockReset(); mockDirectories.length = 0;
  writer = {
    getWritePermission: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
    requestWritePermission: jest.fn().mockResolvedValue({ granted: false, canAskAgain: false }),
    writeImage: jest.fn().mockResolvedValue(undefined),
  };
});

it('写入未完成不返回saved，成功后清理此次下载', async () => {
  let finish!: () => void;
  writer.writeImage = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const pending = createTreeholeImageSaver(writer)(remote);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(writer.writeImage).toHaveBeenCalledWith(local.uri);
  expect(mockDelete).not.toHaveBeenCalled();
  finish();
  expect(await pending).toEqual({ status: 'saved' });
  expect(mockDownload.mock.calls[0][0]).toBe(remote);
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

it('永久拒绝不重复弹权限，不下载也不写入', async () => {
  (writer.getWritePermission as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: false });
  expect(await createTreeholeImageSaver(writer)(remote)).toEqual({ status: 'permission-denied' });
  expect(writer.requestWritePermission).not.toHaveBeenCalled();
  expect(mockDownload).not.toHaveBeenCalled();
  expect(writer.writeImage).not.toHaveBeenCalled();
});

it('首次请求被拒绝返回permission-denied', async () => {
  (writer.getWritePermission as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
  expect(await createTreeholeImageSaver(writer)(remote)).toEqual({ status: 'permission-denied' });
  expect(writer.requestWritePermission).toHaveBeenCalledTimes(1);
  expect(mockDownload).not.toHaveBeenCalled();
});

it('权限恢复后可下载写入，已有权限不重复请求', async () => {
  const save = createTreeholeImageSaver(writer);
  expect(await save(remote)).toEqual({ status: 'saved' });
  expect(writer.requestWritePermission).not.toHaveBeenCalled();
  (writer.getWritePermission as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
  (writer.requestWritePermission as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });
  expect(await save(remote)).toEqual({ status: 'saved' });
  expect(writer.requestWritePermission).toHaveBeenCalledTimes(1);
});

it('权限读取异常是failed，不伪装成拒绝或成功', async () => {
  (writer.getWritePermission as jest.Mock).mockRejectedValue(new Error('native absent'));
  expect(await createTreeholeImageSaver(writer)(remote)).toEqual({ status: 'failed', reason: 'permission' });
  expect(mockDownload).not.toHaveBeenCalled();
});

it('下载失败仍清理本次目录，不调用图库', async () => {
  mockDownload.mockRejectedValue(new Error('partial file'));
  expect(await createTreeholeImageSaver(writer)(remote)).toEqual({ status: 'failed', reason: 'download' });
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(writer.writeImage).not.toHaveBeenCalled();
});

it('写入失败返回failed并清理临时文件', async () => {
  (writer.writeImage as jest.Mock).mockRejectedValue(new Error('write failed'));
  expect(await createTreeholeImageSaver(writer)(remote)).toEqual({ status: 'failed', reason: 'write' });
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

it.each([0, -1])('空或无效文件大小%s不交图库', async (size) => {
  mockDownload.mockResolvedValue({ ...local, size });
  expect(await createTreeholeImageSaver(writer)(remote)).toEqual({ status: 'failed', reason: 'download' });
  expect(writer.writeImage).not.toHaveBeenCalled();
});

it('不把未知格式或HTML当作图片写入', async () => {
  mockDownload.mockResolvedValue({ ...local, extension: '.html' });
  expect(await createTreeholeImageSaver(writer)(remote)).toEqual({ status: 'failed', reason: 'format' });
  expect(writer.writeImage).not.toHaveBeenCalled();
});

it('同URL并发请求只执行一次下载和写入', async () => {
  const save = createTreeholeImageSaver(writer);
  const first = save(remote), second = save(remote);
  expect(first).toBe(second);
  expect(await first).toEqual({ status: 'saved' });
  expect(mockDownload).toHaveBeenCalledTimes(1);
  expect(writer.writeImage).toHaveBeenCalledTimes(1);
});

it('失败后可重试，临时目录不复用', async () => {
  const save = createTreeholeImageSaver(writer);
  mockDownload.mockRejectedValueOnce(new Error('offline'));
  expect((await save(remote)).status).toBe('failed');
  expect(await save(remote)).toEqual({ status: 'saved' });
  expect(new Set(mockDirectories).size).toBe(2);
});

it('写入已成功但临时清理失败，不误报失败诱导重复保存', async () => {
  mockDelete.mockImplementation(() => { throw new Error('cache busy'); });
  expect(await createTreeholeImageSaver(writer)(remote)).toEqual({ status: 'saved' });
});

it.each(['file:///private/a.png', 'javascript:alert(1)', 'not a url'])('无效远端URL不触发权限或网络：%s', async (url) => {
  expect(await createTreeholeImageSaver(writer)(url)).toEqual({ status: 'failed', reason: 'url' });
  expect(writer.getWritePermission).not.toHaveBeenCalled();
  expect(mockDownload).not.toHaveBeenCalled();
});
