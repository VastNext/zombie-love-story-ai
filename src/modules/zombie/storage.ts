/**
 * Zombie 订单专用的存储门面。
 *
 * 与通用上传不同点：
 * - 读取优先使用**短时效签名 URL**（私有对象），仅在无签名能力时回退公开 URL。
 * - 提供删除能力，供原始肖像到期清理使用。
 */

import type { StorageManager } from '@/core/storage';
import { getStorage } from '@/modules/storage/service';

export interface ZombieStorage {
  uploadObject(args: {
    key: string;
    bytes: Uint8Array;
    contentType: string;
  }): Promise<{ url: string }>;
  /** 生成 SeeAPI / 用户可拉取的读取 URL。 */
  getReadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<boolean>;
  getUploadUrl?(key: string, type: string, size: number): Promise<string>;
  getObjectInfo?(key: string): Promise<{ size: number; type: string } | null>;
  getObjectHeader?(key: string): Promise<Uint8Array>;
}

export function wrapStorage(manager: StorageManager): ZombieStorage {
  return {
    async uploadObject({ key, bytes, contentType }) {
      const result = await manager.uploadFile({
        body: bytes,
        key,
        contentType,
        disposition: 'inline',
      });
      if (!result.success || !result.url) {
        throw new Error(result.error || 'storage upload failed');
      }
      return { url: result.url };
    },

    async getReadUrl(key, expiresInSeconds = 3600) {
      const signed = await manager.getPresignedGetUrl({
        key,
        expiresIn: expiresInSeconds,
      });
      if (signed) return signed;
      const publicUrl = manager.getPublicUrl({ key });
      if (publicUrl) return publicUrl;
      throw new Error('storage is not configured for reads');
    },

    async deleteObject(key) {
      return manager.deleteFile({ key });
    },
    async getUploadUrl(key, type, size) {
      const url = await manager.getPresignedPutUrl(key, type, size);
      if (!url) throw new Error('未配置 R2 原图直传');
      return url;
    },
    async getObjectInfo(key) {
      return manager.getObjectInfo(key);
    },
    async getObjectHeader(key) {
      return manager.getObjectHeader(key);
    },
  };
}

/** 返回已配置的存储门面；未配置时返回 null（调用方据此拒绝下单）。 */
export async function getZombieStorage(): Promise<ZombieStorage | null> {
  const manager = await getStorage();
  if (!manager) return null;
  return wrapStorage(manager);
}
