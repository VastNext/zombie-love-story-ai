import { describe, expect, it } from 'vitest';

import {
  generateAccessToken,
  generateIdempotencyKey,
  generateOrderId,
  generateOrderNo,
  hashAccessToken,
  timingSafeEqual,
} from './tokens';

describe('access tokens', () => {
  it('generates unique, URL-safe tokens', () => {
    const a = generateAccessToken();
    const b = generateAccessToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it('hashes deterministically and cannot be reversed', async () => {
    const token = 'fixed-token';
    const h1 = await hashAccessToken(token);
    const h2 = await hashAccessToken(token);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).not.toContain(token);
  });

  it('produces different hashes for different tokens', async () => {
    const h1 = await hashAccessToken('a');
    const h2 = await hashAccessToken('b');
    expect(h1).not.toBe(h2);
  });
});

describe('order identifiers', () => {
  it('prefixes order ids', () => {
    expect(generateOrderId()).toMatch(/^zo_[A-Za-z0-9_-]+$/);
  });

  it('produce ZLS-prefixed uppercase order numbers', () => {
    expect(generateOrderNo()).toMatch(/^ZLS-[0-9A-F]{10}$/);
  });

  it('scopes the idempotency key to the order', () => {
    const key = generateIdempotencyKey('zo_abc');
    expect(key.startsWith('zls-zo_abc-')).toBe(true);
  });
});

describe('timingSafeEqual', () => {
  it('returns true only for identical strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });
});
