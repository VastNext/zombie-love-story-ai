/**
 * Zombie 视频生成规格与请求体构造（纯函数，便于单测）。
 *
 * 重要：SeeAPI 的“双图”通常是首帧/尾帧，不等于“两个人物肖像自动同框演剧情”。
 * 该假设必须在开放收款前用真实样片验证；本文件集中管理模型字段映射，
 * 验证后只需改这里，不必改路由或 worker。
 */

import type { ZombieAspectRatio } from './types';

/** 单个视频模型的字段映射规格。 */
export interface VideoModelSpec {
  model: string;
  endpoint: 'image-to-video';
  provider?: string;
  /** 首帧图字段名 */
  firstFrameField: string;
  /** 尾帧图字段名；模型不支持尾帧时为 undefined */
  lastFrameField?: string;
  /** 时长字段名（整数秒） */
  durationField?: string;
  durationSeconds?: number;
  /** 画幅字段名 */
  aspectField?: string;
  /** 固定附加参数 */
  extraInput?: Record<string, unknown>;
}

/**
 * 默认规格：字段名来自 SeeAPI 公开文档的 Wan 系列示例。
 *
 * 默认时长 25 秒（与产品定位一致）。实际投产前必须用真实样片确认
 * 该时长在 $4.99 售价下仍可盈利；若不可行，须先与用户确认再调整，
 * 不能悄悄降为短片。可用 ZOMBIE_VIDEO_DURATION_SECONDS 覆盖。
 */
export const DEFAULT_VIDEO_SPEC: VideoModelSpec = {
  model: 'wan-3-0',
  endpoint: 'image-to-video',
  provider: 'seeapi',
  firstFrameField: 'first_frame_image',
  lastFrameField: 'last_frame_image',
  durationField: 'duration_seconds',
  durationSeconds: 25,
  aspectField: 'aspect_ratio',
};

/** 固定故事提示词：幸存者 → 感染者 → 拥抱 → 温暖回忆，无血腥。 */
export const ZOMBIE_STORY_PROMPT =
  'Cinematic post-apocalyptic scene. A survivor lowers a raised weapon, ' +
  'arms open, and steps toward their infected partner. The two embrace ' +
  'as the frame hard match-cuts into a warm, sunlit memory of them ' +
  'together. No gore, no blood. Emotional, filmic lighting, gentle camera move.';

export interface BuildInputArgs {
  photoUrls: [string, string];
  aspectRatio: ZombieAspectRatio;
  prompt?: string;
  durationSeconds?: number;
}

/**
 * 构造 SeeAPI `input` 对象。
 * photoUrls[0] 为幸存者（首帧），photoUrls[1] 为感染者（尾帧）。
 */
export function buildGenerationInput(
  spec: VideoModelSpec,
  args: BuildInputArgs
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: args.prompt ?? ZOMBIE_STORY_PROMPT,
    [spec.firstFrameField]: args.photoUrls[0],
  };

  if (spec.lastFrameField) {
    input[spec.lastFrameField] = args.photoUrls[1];
  }

  const duration = args.durationSeconds ?? spec.durationSeconds;
  if (spec.durationField && duration) {
    input[spec.durationField] = duration;
  }

  if (spec.aspectField) {
    input[spec.aspectField] = args.aspectRatio;
  }

  if (spec.extraInput) {
    Object.assign(input, spec.extraInput);
  }

  return input;
}

/** 完整的 `/v1/generations` 请求体。 */
export function buildGenerationRequest(
  spec: VideoModelSpec,
  args: BuildInputArgs
): {
  model: string;
  endpoint: string;
  provider?: string;
  input: Record<string, unknown>;
} {
  const body: {
    model: string;
    endpoint: string;
    provider?: string;
    input: Record<string, unknown>;
  } = {
    model: spec.model,
    endpoint: spec.endpoint,
    input: buildGenerationInput(spec, args),
  };
  if (spec.provider) body.provider = spec.provider;
  return body;
}

/** 从 SeeAPI 任务响应中提取视频资产。 */
export interface VideoAsset {
  url: string;
  assetId?: string;
  expiresAt?: Date | null;
}

export function pickVideoAsset(assets: unknown): VideoAsset | null {
  if (!Array.isArray(assets)) return null;
  for (const asset of assets) {
    if (!asset || typeof asset !== 'object') continue;
    const record = asset as Record<string, unknown>;
    if (record.type !== 'video') continue;
    const url = typeof record.url === 'string' ? record.url : null;
    if (!url) continue;
    const assetId =
      (typeof record.asset_id === 'string' && record.asset_id) ||
      (typeof record.id === 'string' && record.id) ||
      undefined;
    let expiresAt: Date | null = null;
    if (typeof record.expires_at === 'string') {
      const parsed = new Date(record.expires_at);
      if (!Number.isNaN(parsed.getTime())) expiresAt = parsed;
    }
    return { url, assetId, expiresAt };
  }
  return null;
}
