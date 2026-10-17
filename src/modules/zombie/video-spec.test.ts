import { describe, expect, it } from 'vitest';

import {
  buildGenerationInput,
  buildGenerationRequest,
  DEFAULT_VIDEO_SPEC,
  pickVideoAsset,
} from './video-spec';

describe('buildGenerationInput', () => {
  it('maps photo 1 to the first frame and photo 2 to the last frame', () => {
    const input = buildGenerationInput(DEFAULT_VIDEO_SPEC, {
      photoUrls: ['https://x/one.jpg', 'https://x/two.jpg'],
      aspectRatio: '9:16',
    });
    expect(input.first_frame_image).toBe('https://x/one.jpg');
    expect(input.last_frame_image).toBe('https://x/two.jpg');
    expect(input.aspect_ratio).toBe('9:16');
  });

  it('honours an explicit duration override', () => {
    const input = buildGenerationInput(DEFAULT_VIDEO_SPEC, {
      photoUrls: ['a', 'b'],
      aspectRatio: '16:9',
      durationSeconds: 12,
    });
    expect(input.duration_seconds).toBe(12);
  });

  it('omits the last-frame field for specs that lack one', () => {
    const input = buildGenerationInput(
      { ...DEFAULT_VIDEO_SPEC, lastFrameField: undefined },
      { photoUrls: ['a', 'b'], aspectRatio: '9:16' }
    );
    expect(input.last_frame_image).toBeUndefined();
  });
});

describe('buildGenerationRequest', () => {
  it('includes model, endpoint and provider', () => {
    const request = buildGenerationRequest(DEFAULT_VIDEO_SPEC, {
      photoUrls: ['a', 'b'],
      aspectRatio: '9:16',
    });
    expect(request.model).toBe(DEFAULT_VIDEO_SPEC.model);
    expect(request.endpoint).toBe('image-to-video');
    expect(request.provider).toBe(DEFAULT_VIDEO_SPEC.provider);
  });

  it('drops the provider key when the spec has none', () => {
    const request = buildGenerationRequest(
      { ...DEFAULT_VIDEO_SPEC, provider: undefined },
      { photoUrls: ['a', 'b'], aspectRatio: '9:16' }
    );
    expect('provider' in request).toBe(false);
  });
});

describe('pickVideoAsset', () => {
  it('returns the first video asset with its expiry', () => {
    const asset = pickVideoAsset([
      { type: 'image', url: 'https://x/cover.png' },
      {
        asset_id: 'asset_1',
        type: 'video',
        url: 'https://x/v.mp4',
        expires_at: '2026-02-01T00:00:00Z',
      },
    ]);
    expect(asset).toMatchObject({ url: 'https://x/v.mp4', assetId: 'asset_1' });
    expect(asset?.expiresAt?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('returns null when there is no video asset', () => {
    expect(pickVideoAsset([{ type: 'image', url: 'x' }])).toBeNull();
    expect(pickVideoAsset([])).toBeNull();
    expect(pickVideoAsset(undefined)).toBeNull();
  });

  it('falls back to id when asset_id is absent', () => {
    const asset = pickVideoAsset([
      { id: 'asset_id_2', type: 'video', url: 'https://x/v.mp4' },
    ]);
    expect(asset?.assetId).toBe('asset_id_2');
  });
});
