import { describe, expect, it } from 'vitest';

import {
  authorizeAdminTest,
  parseMode,
  parsePaused,
  parsePositiveInt,
} from './authorize';

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
  it('defaults to admin_test for anything other than live', () => {
    expect(parseMode(undefined)).toBe('admin_test');
    expect(parseMode('live')).toBe('live');
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
