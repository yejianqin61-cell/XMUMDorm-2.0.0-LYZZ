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

export function createTreeholeImageSaver(_writer: TreeholeAlbumWriter): TreeholeImageSaver {
  return async () => ({ status: 'failed', reason: 'unavailable' });
}
