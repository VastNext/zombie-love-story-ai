import { describe, expect, it } from 'vitest';

import { R2Provider } from './r2';

describe('R2 原图预签名上传', () => {
  it('只允许 PUT 指定对象，签名绑定 Content-Type 且五分钟内过期', async () => {
    const storage = new R2Provider({
      accountId: 'test-account',
      accessKeyId: 'test-access',
      secretAccessKey: 'test-secret',
      bucket: 'private-portraits',
    });
    const signed = new URL(
      await storage.getPresignedPutUrl({
        key: 'zombie/orders/zo_123/photo1',
        type: 'image/png',
        size: 1024,
        expiresIn: 300,
      })
    );
    expect(signed.pathname).toBe(
      '/private-portraits/uploads/zombie/orders/zo_123/photo1'
    );
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toContain(
      'content-type'
    );
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toContain(
      'content-length'
    );
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toContain(
      'if-none-match'
    );
    expect(signed.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });
});
