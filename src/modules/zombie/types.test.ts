import { describe, expect, it } from 'vitest';

import {
  canTransition,
  DOWNLOAD_WINDOW_DAYS,
  downloadExpireAt,
  isAspectRatio,
  isTerminalStatus,
  isWithinDownloadWindow,
  MS_PER_DAY,
} from './types';

describe('canTransition', () => {
  it('allows the documented happy path', () => {
    expect(canTransition('draft', 'checkout_pending')).toBe(true);
    expect(canTransition('checkout_pending', 'paid')).toBe(true);
    expect(canTransition('paid', 'queued')).toBe(true);
    expect(canTransition('queued', 'submitted')).toBe(true);
    expect(canTransition('submitted', 'processing')).toBe(true);
    expect(canTransition('processing', 'succeeded')).toBe(true);
  });

  it('lets admin_test skip paid via queued', () => {
    expect(canTransition('draft', 'queued')).toBe(true);
  });

  it('refuses to leave terminal states', () => {
    expect(canTransition('succeeded', 'processing')).toBe(false);
    expect(canTransition('refunded', 'queued')).toBe(false);
    expect(canTransition('canceled', 'paid')).toBe(false);
  });

  it('refuses to jump straight from draft to succeeded', () => {
    expect(canTransition('draft', 'succeeded')).toBe(false);
  });

  it('lets a failed order be retried or refunded', () => {
    expect(canTransition('failed_needs_attention', 'queued')).toBe(true);
    expect(canTransition('failed_needs_attention', 'refunded')).toBe(true);
  });
});

describe('isTerminalStatus', () => {
  it('classifies terminal states', () => {
    expect(isTerminalStatus('succeeded')).toBe(true);
    expect(isTerminalStatus('processing')).toBe(false);
    expect(isTerminalStatus('nonsense')).toBe(false);
  });
});

describe('download window', () => {
  const completed = new Date('2026-01-01T00:00:00Z');

  it('is open just before the window closes', () => {
    const justBefore = new Date(
      completed.getTime() + DOWNLOAD_WINDOW_DAYS * MS_PER_DAY - 1000
    );
    expect(isWithinDownloadWindow(completed, justBefore)).toBe(true);
  });

  it('closes exactly at the boundary and after', () => {
    const at = new Date(
      completed.getTime() + DOWNLOAD_WINDOW_DAYS * MS_PER_DAY
    );
    const after = new Date(at.getTime() + 1);
    expect(isWithinDownloadWindow(completed, at)).toBe(false);
    expect(isWithinDownloadWindow(completed, after)).toBe(false);
  });

  it('is closed when the order never completed', () => {
    expect(isWithinDownloadWindow(null, new Date())).toBe(false);
  });

  it('computes the expiry from completedAt, not payment time', () => {
    expect(downloadExpireAt(completed)?.toISOString()).toBe(
      new Date(
        completed.getTime() + DOWNLOAD_WINDOW_DAYS * MS_PER_DAY
      ).toISOString()
    );
    expect(downloadExpireAt(null)).toBeNull();
  });
});

describe('isAspectRatio', () => {
  it('accepts only the two supported ratios', () => {
    expect(isAspectRatio('9:16')).toBe(true);
    expect(isAspectRatio('16:9')).toBe(true);
    expect(isAspectRatio('4:3')).toBe(false);
    expect(isAspectRatio(null)).toBe(false);
  });
});
