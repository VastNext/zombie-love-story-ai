import { describe, expect, it } from 'vitest';

import {
  buildGenerationInput,
  buildGenerationRequest,
  DEFAULT_VIDEO_SPEC,
  listVideoModels,
  pickVideoAsset,
  resolveVideoSpecFor,
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

describe('VIDEO_SPECS 注册表', () => {
  it('包含所有单次可生成 ≥25 秒的候选模型', () => {
    expect(listVideoModels().sort()).toEqual(
      ['grok-imagine-video', 'seedance-2-5', 'wan-3-0', 'wan-3-0-prime'].sort()
    );
  });

  it('默认规格是 wan-3-0 / 首尾帧 / 25 秒', () => {
    expect(DEFAULT_VIDEO_SPEC.model).toBe('wan-3-0');
    expect(DEFAULT_VIDEO_SPEC.imageMode).toBe('first-last');
    expect(DEFAULT_VIDEO_SPEC.durationSeconds).toBe(25);
  });

  it('未知模型返回 null', () => {
    expect(resolveVideoSpecFor('does-not-exist')).toBeNull();
    expect(resolveVideoSpecFor('seedance-2-mini')).toBeNull(); // 上限 15s，故意不收录
  });
});

describe('grok 参考图模式', () => {
  const grok = resolveVideoSpecFor('grok-imagine-video')!;

  it('把两张肖像放进 reference_images 数组', () => {
    const input = buildGenerationInput(grok, {
      photoUrls: ['https://x/a.jpg', 'https://x/b.jpg'],
      aspectRatio: '9:16',
    });
    expect(input.reference_images).toEqual([
      'https://x/a.jpg',
      'https://x/b.jpg',
    ]);
    // 参考图模式不应出现首尾帧字段
    expect(input.first_frame_image).toBeUndefined();
    expect(input.last_frame_image).toBeUndefined();
    expect(input.aspect_ratio).toBe('9:16');
    expect(input.duration_seconds).toBe(25);
    expect(input.resolution).toBe('720p');
  });

  it('请求体是 image-to-video 且不带 provider 覆盖', () => {
    const req = buildGenerationRequest(grok, {
      photoUrls: ['a', 'b'],
      aspectRatio: '16:9',
    });
    expect(req.model).toBe('grok-imagine-video');
    expect(req.endpoint).toBe('image-to-video');
    expect('provider' in req).toBe(false);
  });

  it('允许按分辨率/时长覆盖', () => {
    const input = buildGenerationInput(grok, {
      photoUrls: ['a', 'b'],
      aspectRatio: '9:16',
      resolution: '1080p',
      durationSeconds: 30,
    });
    expect(input.resolution).toBe('1080p');
    expect(input.duration_seconds).toBe(30);
  });

  it('缺少 referenceField 的规格会报错而不是静默发错请求', () => {
    expect(() =>
      buildGenerationInput(
        { ...grok, referenceField: undefined },
        { photoUrls: ['a', 'b'], aspectRatio: '9:16' }
      )
    ).toThrow(/referenceField/);
  });
});
