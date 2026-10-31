/**
 * 相册写入适配器（阶段A-02，R-5 底座）
 *
 * 丙的保存模块只认识「读权限 / 请求权限 / 写一张」三件事（`TreeholeAlbumWriter`），
 * 系统图库则是 `expo-media-library` 的 legacy 入口。本文件是两者之间**唯一**的胶水：
 *
 * - 只申请「仅保存」权限：`writeOnly=true` + 空 granularPermissions（⛔ 不请求读取图库）；
 * - 永久拒绝时不反复弹系统框（`canAskAgain=false` 由保存事务翻译成 permission-denied）；
 * - 写入异常**向上抛**，由保存事务翻成 failed —— ⛔ 这里不吞成成功；
 * - 图库不可用时调用方**不注入**保存入口（见 `isAlbumAvailable`），⛔ 不拿系统分享冒充保存。
 *
 * ⛔ 本文件不碰文件下载与权限文案：前者是保存模块的事，后者是词条的事。
 */

import * as Photos from 'expo-media-library/legacy';

import {
  createTreeholeImageSaver,
  type TreeholeAlbumWriter,
  type TreeholeImageSaver,
} from '@/features/campus/treeholeImageSave';

/** 图库端口（测试注入用；默认就是 expo-media-library 的 legacy 入口） */
export type AlbumPhotoPort = {
  isAvailableAsync: () => Promise<boolean>;
  getPermissionsAsync: (
    writeOnly?: boolean,
    granularPermissions?: readonly string[]
  ) => Promise<{ granted: boolean; canAskAgain: boolean }>;
  requestPermissionsAsync: (
    writeOnly?: boolean,
    granularPermissions?: readonly string[]
  ) => Promise<{ granted: boolean; canAskAgain: boolean }>;
  saveToLibraryAsync: (localUri: string) => Promise<void>;
};

const DEFAULT_PORT = Photos as unknown as AlbumPhotoPort;

/** 设备/构建是否真的带图库能力：不可用就不注入保存入口 */
export async function isAlbumAvailable(port: AlbumPhotoPort = DEFAULT_PORT): Promise<boolean> {
  try {
    return await port.isAvailableAsync();
  } catch {
    return false;
  }
}

/** 把系统图库包成保存模块认识的三件事（仅保存权限） */
export function createAlbumWriter(port: AlbumPhotoPort = DEFAULT_PORT): TreeholeAlbumWriter {
  return {
    getWritePermission: () => port.getPermissionsAsync(true, []),
    requestWritePermission: () => port.requestPermissionsAsync(true, []),
    writeImage: localUri => port.saveToLibraryAsync(localUri),
  };
}

/** 保存事务（同一实例在详情与预览间共享，避免重复下载/写入） */
export function createAlbumSaver(port: AlbumPhotoPort = DEFAULT_PORT): TreeholeImageSaver {
  return createTreeholeImageSaver(createAlbumWriter(port));
}
