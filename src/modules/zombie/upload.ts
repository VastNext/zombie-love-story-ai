/**
 * 上传校验（纯函数）。
 *
 * 只做服务端能可靠判断的事：数量、MIME、大小。
 * 「是否成年人 / 是否有授权」属于用户声明与人工审核，不能靠代码断言。
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export interface UploadFileInfo {
  name?: string;
  type: string;
  size: number;
}

export type UploadValidation =
  | { ok: true }
  | { ok: false; reason: 'count' | 'type' | 'size' | 'empty'; message: string };

export function validateUpload(files: UploadFileInfo[]): UploadValidation {
  if (files.length !== 2) {
    return {
      ok: false,
      reason: 'count',
      message: '请上传两张照片：第一张为幸存者，第二张为感染者',
    };
  }
  for (const file of files) {
    if (!file.size || file.size <= 0) {
      return { ok: false, reason: 'empty', message: '照片为空' };
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
      return {
        ok: false,
        reason: 'type',
        message: '仅支持 JPG、PNG 或 WebP 格式',
      };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, reason: 'size', message: '单张照片不能超过 10 MB' };
    }
  }
  return { ok: true };
}

/** 归一化邮箱；空串/null 视为「不要通知」。 */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed.slice(0, 254);
}
