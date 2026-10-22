import { describe, expect, it } from 'vitest';

import {
  isImageSignature,
  parseSandboxPhotoInfo,
  photoObjectKey,
  verifyUploadedPhotos,
} from './upload-request';

describe('原图文件签名', () => {
  it('只接受与声明 MIME 对应的 JPEG、PNG、WebP 文件头', () => {
    expect(
      isImageSignature('image/jpeg', Uint8Array.of(0xff, 0xd8, 0xff))
    ).toBe(true);
    expect(
      isImageSignature(
        'image/png',
        Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)
      )
    ).toBe(true);
    expect(
      isImageSignature('image/webp', new TextEncoder().encode('RIFF1234WEBP'))
    ).toBe(true);
    expect(
      isImageSignature('image/png', new TextEncoder().encode('not an image'))
    ).toBe(false);
    expect(
      isImageSignature('image/webp', new TextEncoder().encode('RIFF1234WAVE'))
    ).toBe(false);
  });
});

describe('沙盒照片元数据', () => {
  it('接受两张有效照片的元数据，不需要上传原图字节', () => {
    expect(
      parseSandboxPhotoInfo([
        { name: 'one.png', type: 'image/png', size: 7 * 1024 * 1024 },
        { name: 'two.webp', type: 'image/webp', size: 6 * 1024 * 1024 },
      ])
    ).toEqual({ ok: true });
  });

  it('拒绝超限和伪造的元数据', () => {
    expect(
      parseSandboxPhotoInfo([{ name: 'x', type: 'image/png', size: 100 }]).ok
    ).toBe(false);
    expect(
      parseSandboxPhotoInfo([
        { name: 'x', type: 'application/pdf', size: 100 },
        { name: 'y', type: 'image/png', size: 100 },
      ]).ok
    ).toBe(false);
    expect(
      parseSandboxPhotoInfo([
        { name: 'x', type: 'image/png', size: '100' },
        { name: 'y', type: 'image/png', size: 100 },
      ]).ok
    ).toBe(false);
  });
});

describe('正式订单照片核验', () => {
  it('两张原图均存在且类型大小有效才通过', async () => {
    const keys = [photoObjectKey('zo_123', 1), photoObjectKey('zo_123', 2)];
    expect(keys).toEqual([
      'zombie/orders/zo_123/photo1',
      'zombie/orders/zo_123/photo2',
    ]);
    const info = async (key: string) =>
      key === keys[0]
        ? { size: 8 * 1024 * 1024, type: 'image/png' }
        : { size: 3 * 1024 * 1024, type: 'image/webp' };
    expect(await verifyUploadedPhotos('zo_123', info)).toEqual({
      ok: true,
      keys,
    });
  });

  it('拒绝缺失、错误类型、超限及元数据异常，不允许先付款', async () => {
    for (const invalid of [
      null,
      { size: 0, type: 'image/png' },
      { size: 1, type: 'text/plain' },
      { size: 11 * 1024 * 1024, type: 'image/png' },
      { size: NaN, type: 'image/png' },
    ]) {
      const result = await verifyUploadedPhotos('zo_123', async (key) =>
        key.endsWith('photo1') ? { size: 100, type: 'image/jpeg' } : invalid
      );
      expect(result.ok).toBe(false);
    }
  });

  it('R2 查询失败时不会把网络错误视为未上传或允许付款', async () => {
    await expect(
      verifyUploadedPhotos('zo_123', async () => {
        throw new Error('R2 暂不可用');
      })
    ).rejects.toThrow('R2 暂不可用');
  });
});
