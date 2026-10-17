import { describe, expect, it } from 'vitest';

import { MAX_UPLOAD_BYTES, normalizeEmail, validateUpload } from './upload';

const jpg = { type: 'image/jpeg', size: 1024 };

describe('validateUpload', () => {
  it('accepts exactly two allowed images', () => {
    expect(validateUpload([jpg, { type: 'image/png', size: 2048 }])).toEqual({
      ok: true,
    });
  });

  it('rejects the wrong number of files', () => {
    expect(validateUpload([jpg])).toMatchObject({ ok: false, reason: 'count' });
    expect(validateUpload([jpg, jpg, jpg])).toMatchObject({
      ok: false,
      reason: 'count',
    });
  });

  it('rejects unsupported mime types', () => {
    expect(
      validateUpload([jpg, { type: 'image/gif', size: 1024 }])
    ).toMatchObject({ ok: false, reason: 'type' });
  });

  it('rejects oversized files', () => {
    expect(
      validateUpload([jpg, { type: 'image/webp', size: MAX_UPLOAD_BYTES + 1 }])
    ).toMatchObject({ ok: false, reason: 'size' });
  });

  it('rejects empty files', () => {
    expect(
      validateUpload([jpg, { type: 'image/jpeg', size: 0 }])
    ).toMatchObject({
      ok: false,
      reason: 'empty',
    });
  });
});

describe('normalizeEmail', () => {
  it('returns trimmed valid emails', () => {
    expect(normalizeEmail('  a@b.com ')).toBe('a@b.com');
  });

  it('returns null for blank or invalid input', () => {
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('   ')).toBeNull();
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });
});
