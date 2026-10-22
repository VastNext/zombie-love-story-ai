import { describe, expect, it } from 'vitest';

import {
  authorizeAdminTest,
  canCheckoutZombieOrder,
  canCreateZombieOrder,
  parseMode,
  parsePaused,
  parsePositiveInt,
} from './authorize';

describe('Stripe 沙盒授权', () => {
  it('拒绝访客建单，并仅允许管理员支付本人沙盒订单', () => {
    expect(canCreateZombieOrder('stripe_sandbox', false)).toBe(false);
    expect(canCreateZombieOrder('stripe_sandbox', true)).toBe(true);
    expect(
      canCheckoutZombieOrder(
        'stripe_sandbox',
        true,
        'stripe_sandbox',
        'admin-1',
        'admin-1'
      )
    ).toBe(true);
    expect(
      canCheckoutZombieOrder(
        'stripe_sandbox',
        false,
        'stripe_sandbox',
        'admin-1',
        'admin-1'
      )
    ).toBe(false);
    expect(
      canCheckoutZombieOrder(
        'stripe_sandbox',
        true,
        'stripe_sandbox',
        'admin-1',
        'admin-2'
      )
    ).toBe(false);
    expect(
      canCheckoutZombieOrder(
        'stripe_sandbox',
        true,
        'stripe',
        'admin-1',
        'admin-1'
      )
    ).toBe(false);
    expect(
      canCheckoutZombieOrder('live', false, 'stripe_sandbox', null, null)
    ).toBe(false);
    expect(canCheckoutZombieOrder('live', false, 'stripe', null, null)).toBe(
      true
    );
  });
});

const base = {
  isAdmin: true,
  mode: 'admin_test' as const,
  paused: false,
  code: 'FountainChan',
  expectedCode: 'FountainChan',
  userSubmissions: 0,
  userLimit: 3,
  globalSubmissions: 0,
  globalLimit: 10,
};

describe('parseMode / parsePaused / parsePositiveInt', () => {
  it('recognizes only supported modes', () => {
    expect(parseMode(undefined)).toBe('admin_test');
    expect(parseMode('live')).toBe('live');
    expect(parseMode('stripe_sandbox')).toBe('stripe_sandbox');
    expect(parseMode('LIVE')).toBe('admin_test');
  });

  it('parses paused strictly', () => {
    expect(parsePaused('true')).toBe(true);
    expect(parsePaused(true)).toBe(true);
    expect(parsePaused('false')).toBe(false);
    expect(parsePaused(undefined)).toBe(false);
  });

  it('falls back on invalid limits', () => {
    expect(parsePositiveInt('5', 3)).toBe(5);
    expect(parsePositiveInt('0', 3)).toBe(3);
    expect(parsePositiveInt('-2', 3)).toBe(3);
    expect(parsePositiveInt('abc', 3)).toBe(3);
  });
});

describe('authorizeAdminTest', () => {
  it('allows a valid admin test request', () => {
    expect(authorizeAdminTest(base)).toEqual({ allowed: true });
  });

  it('rejects non-admin even with a correct code', () => {
    const decision = authorizeAdminTest({ ...base, isAdmin: false });
    expect(decision).toMatchObject({ allowed: false, reason: 'not_admin' });
  });

  it('rejects when mode is live', () => {
    const decision = authorizeAdminTest({ ...base, mode: 'live' });
    expect(decision).toMatchObject({ allowed: false, reason: 'wrong_mode' });
  });

  it('rejects when paused', () => {
    const decision = authorizeAdminTest({ ...base, paused: true });
    expect(decision).toMatchObject({ allowed: false, reason: 'paused' });
  });

  it('rejects missing and wrong codes', () => {
    expect(authorizeAdminTest({ ...base, code: null })).toMatchObject({
      reason: 'missing_code',
    });
    expect(authorizeAdminTest({ ...base, code: 'nope' })).toMatchObject({
      reason: 'bad_code',
    });
  });

  it('rejects once the per-admin limit is reached', () => {
    const decision = authorizeAdminTest({ ...base, userSubmissions: 3 });
    expect(decision).toMatchObject({
      allowed: false,
      reason: 'user_quota_exceeded',
    });
  });

  it('rejects once the global limit is reached', () => {
    const decision = authorizeAdminTest({ ...base, globalSubmissions: 10 });
    expect(decision).toMatchObject({
      allowed: false,
      reason: 'global_quota_exceeded',
    });
  });
});
