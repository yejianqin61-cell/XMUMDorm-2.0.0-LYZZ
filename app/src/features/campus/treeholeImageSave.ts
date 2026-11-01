import { Directory, File, Paths } from 'expo-file-system';

/** 原生图库由公共配置单写者注入；此模块不把下载或分享视为相册写入。 */
export type TreeholeSaveResult =
  | { status: 'saved' }
  | { status: 'permission-denied' }
  | { status: 'failed'; reason: 'unavailable' | 'url' | 'permission' | 'download' | 'format' | 'write' };

export type TreeholeAlbumWriter = {
  getWritePermission: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  requestWritePermission: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  writeImage: (localUri: string) => Promise<void>;
};
export type TreeholeImageSaver = (url: string) => Promise<TreeholeSaveResult>;

let downloadSequence = 0;

/** 一次事务只删除自己创建的缓存目录；不保存用户相册路径或敏感URL到持久状态。 */
export function createTreeholeImageSaver(writer: TreeholeAlbumWriter): TreeholeImageSaver {
  const pending = new Map<string, Promise<TreeholeSaveResult>>();
  async function perform(url: string): Promise<TreeholeSaveResult> {
    let directory: Directory | undefined;
    let reason: Extract<TreeholeSaveResult, { status: 'failed' }>['reason'] = 'permission';
    try {
      let permission = await writer.getWritePermission();
      if (!permission.granted && permission.canAskAgain) permission = await writer.requestWritePermission();
      if (!permission.granted) return { status: 'permission-denied' };
      reason = 'download';
      directory = new Directory(Paths.cache, `treehole-image-${Date.now()}-${downloadSequence++}`);
      directory.create();
      const file = await File.downloadFileAsync(url, directory);
      if (!file.exists || !Number.isFinite(file.size) || file.size <= 0 || !file.uri.startsWith('file:///')) {
        return { status: 'failed', reason };
      }
      if (!/^\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.extension)) {
        return { status: 'failed', reason: 'format' };
      }
      reason = 'write';
      await writer.writeImage(file.uri);
      return { status: 'saved' };
    } catch {
      return { status: 'failed', reason };
    } finally {
      try {
        if (directory?.exists) directory.delete();
      } catch {
        // 写入相册成功后，缓存清理异常不能变成“保存失败”并诱导用户重复写入。
      }
    }
  }
  return (url) => {
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Not a remote image');
    } catch {
      return Promise.resolve({ status: 'failed', reason: 'url' });
    }
    const existing = pending.get(url);
    if (existing) return existing;
    const request = perform(url).finally(() => { if (pending.get(url) === request) pending.delete(url); });
    pending.set(url, request);
    return request;
  };
}
