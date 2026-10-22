import { validateUpload } from './upload';

export function isImageSignature(type: string, bytes: Uint8Array): boolean {
  if (type === 'image/jpeg')
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png')
    return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  if (type === 'image/webp')
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
    );
  return false;
}

export function photoObjectKey(orderId: string, slot: 1 | 2): string {
  return `zombie/orders/${orderId}/photo${slot}`;
}

export async function verifyUploadedPhotos(
  orderId: string,
  getInfo: (key: string) => Promise<{ size: number; type: string } | null>
): Promise<
  { ok: true; keys: [string, string] } | { ok: false; message: string }
> {
  const keys: [string, string] = [
    photoObjectKey(orderId, 1),
    photoObjectKey(orderId, 2),
  ];
  const photos = await Promise.all(keys.map(getInfo));
  if (photos.some((photo) => !photo || !Number.isFinite(photo.size))) {
    return { ok: false, message: '请先上传两张有效照片' };
  }
  const check = validateUpload(photos as { size: number; type: string }[]);
  return check.ok ? { ok: true, keys } : { ok: false, message: check.message };
}

/** 沙盒只校验所选文件的声明信息，不接收或保存肖像字节。 */
export function parseSandboxPhotoInfo(value: unknown) {
  if (!Array.isArray(value) || value.length !== 2) {
    return validateUpload([]);
  }
  if (
    !value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.type === 'string' &&
        typeof item.size === 'number' &&
        Number.isFinite(item.size) &&
        typeof item.name === 'string'
    )
  ) {
    return validateUpload([]);
  }
  return validateUpload(value);
}
