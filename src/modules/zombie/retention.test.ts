import { describe, expect, it } from 'vitest';

import { DRAFT_TTL_MS, photoRetentionDecision } from './retention';
import {
  PHOTO_RETENTION_AFTER_SUCCESS_MS,
  PHOTO_RETENTION_FAILED_MS,
} from './types';

const now = new Date('2026-03-01T00:00:00Z');

function order(overrides: Record<string, any> = {}) {
  return {
    status: 'succeeded',
    photo1Key: 'p1',
    photo2Key: 'p2',
    photosDeletedAt: null,
    completedAt: new Date(now.getTime() - 1000),
    updatedAt: now,
    createdAt: new Date(now.getTime() - 1000),
    ...overrides,
  };
}

describe('photoRetentionDecision', () => {
  it('keeps photos right after delivery', () => {
    expect(photoRetentionDecision(order(), now)).toMatchObject({
      action: 'keep',
    });
  });

  it('deletes photos 24h after delivery', () => {
    const delivered = order({
      completedAt: new Date(now.getTime() - PHOTO_RETENTION_AFTER_SUCCESS_MS),
    });
    expect(photoRetentionDecision(delivered, now)).toMatchObject({
      action: 'delete',
      reason: 'delivered_24h',
      manualFollowUp: false,
    });
  });

  it('never deletes photos for orders still in progress', () => {
    for (const status of ['paid', 'queued', 'submitted', 'processing']) {
      expect(
        photoRetentionDecision(
          order({
            status,
            createdAt: new Date(now.getTime() - 30 * 24 * 3600_000),
          }),
          now
        )
      ).toMatchObject({ action: 'keep', reason: 'in_progress' });
    }
  });

  it('purges failed orders after 7 days and flags follow-up', () => {
    const failed = order({
      status: 'failed_needs_attention',
      completedAt: null,
      updatedAt: new Date(now.getTime() - PHOTO_RETENTION_FAILED_MS),
    });
    expect(photoRetentionDecision(failed, now)).toMatchObject({
      action: 'delete',
      reason: 'failed_7d',
      manualFollowUp: true,
    });
  });

  it('keeps failed orders inside the retry window', () => {
    const failed = order({
      status: 'failed_needs_attention',
      completedAt: null,
      updatedAt: new Date(now.getTime() - 1000),
    });
    expect(photoRetentionDecision(failed, now)).toMatchObject({
      action: 'keep',
    });
  });

  it('expires abandoned drafts after the TTL', () => {
    const draft = order({
      status: 'draft',
      completedAt: null,
      createdAt: new Date(now.getTime() - DRAFT_TTL_MS),
    });
    expect(photoRetentionDecision(draft, now)).toMatchObject({
      action: 'expire_draft',
    });
  });

  it('keeps drafts within the TTL', () => {
    const draft = order({
      status: 'draft',
      completedAt: null,
      createdAt: new Date(now.getTime() - 1000),
    });
    expect(photoRetentionDecision(draft, now)).toMatchObject({
      action: 'keep',
    });
  });

  it('is idempotent once photos are deleted', () => {
    expect(
      photoRetentionDecision(order({ photosDeletedAt: now }), now)
    ).toMatchObject({ action: 'keep', reason: 'already_deleted' });
  });

  it('keeps orders with no photos', () => {
    expect(
      photoRetentionDecision(order({ photo1Key: null, photo2Key: null }), now)
    ).toMatchObject({ action: 'keep', reason: 'no_photos' });
  });

  it('handles a missing order', () => {
    expect(photoRetentionDecision(null, now)).toMatchObject({ action: 'keep' });
  });
});
