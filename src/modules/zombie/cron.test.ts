import { describe, expect, it } from 'vitest';

import { isCronAuthorized } from './cron';

describe('定时任务授权', () => {
  it('拒绝伪造的 Vercel 请求头和未配置密钥', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-vercel-cron': '1' },
    });
    expect(isCronAuthorized(request, 'secret')).toBe(false);
    expect(isCronAuthorized(request, '')).toBe(false);
  });
  it('只接受正确的 Bearer 密钥', () => {
    const request = new Request('https://example.com', {
      headers: { authorization: 'Bearer secret' },
    });
    expect(isCronAuthorized(request, 'secret')).toBe(true);
    expect(isCronAuthorized(request, 'other')).toBe(false);
  });
});
