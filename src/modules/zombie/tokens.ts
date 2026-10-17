/**
 * 订单标识、登录态令牌、幂等键的生成与哈希。
 *
 * 只使用 Web Crypto，Node 与 Cloudflare Workers 都可用。
 */

const ACCESS_TOKEN_BYTES = 32;
const ORDER_ID_BYTES = 12;

/** URL 安全 base64（去掉 padding）。 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** 高熵访问令牌；只有用户端持有，服务端只存哈希。 */
export function generateAccessToken(): string {
  return toBase64Url(randomBytes(ACCESS_TOKEN_BYTES));
}

/** 内部订单主键。 */
export function generateOrderId(): string {
  return `zo_${toBase64Url(randomBytes(ORDER_ID_BYTES))}`;
}

/** 面向用户的订单号，便于人工核对（非访问凭证）。 */
export function generateOrderNo(): string {
  const hex = Array.from(randomBytes(5))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `ZLS-${hex}`;
}

/** 访问令牌哈希（SHA-256 十六进制）。令牌本身高熵，无需加盐慢哈希。 */
export async function hashAccessToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SeeAPI 幂等键：同一逻辑任务重试必须沿用同一个键。 */
export function generateIdempotencyKey(orderId: string): string {
  return `zls-${orderId}-${toBase64Url(randomBytes(8))}`;
}

/** 恒定时间字符串比较，用于比对令牌哈希。 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
