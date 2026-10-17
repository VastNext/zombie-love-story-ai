/**
 * Zombie 视频生成规格与请求体构造（纯函数，便于单测）。
 *
 * 重要：SeeAPI 的「双图」有两种语义，不能混为一谈：
 * - first-last：首帧 + 尾帧（wan 系列）
 * - reference ：角色参考图数组（grok-imagine-video 等，专为「让指定人物出现在视频里」设计）
 *
 * 该假设必须在开放收款前用真实样片验证；本文件集中管理模型字段映射，
 * 验证后只需改这里（或环境变量），不必改路由或 worker。
 */

import type { ZombieAspectRatio } from './types';

/** 输入图片的语义模式。 */
export type ImageMode = 'first-last' | 'reference';

/** 单个视频模型的字段映射规格。 */
export interface VideoModelSpec {
  model: string;
  endpoint: 'image-to-video' | 'reference-to-video';
  provider?: string;
  imageMode: ImageMode;
  /** imageMode=first-last 时的首帧字段名 */
  firstFrameField?: string;
  /** imageMode=first-last 时的尾帧字段名（可选） */
  lastFrameField?: string;
  /** imageMode=reference 时的参考图数组字段名 */
  referenceField?: string;
  durationField?: string;
  durationSeconds?: number;
  aspectField?: string;
  resolutionField?: string;
  resolution?: string;
  /** 固定附加参数 */
  extraInput?: Record<string, unknown>;
}

/** 固定故事提示词：幸存者 → 感染者 → 拥抱 → 温暖回忆，无血腥。 */
export const ZOMBIE_STORY_PROMPT =
  'Cinematic post-apocalyptic scene. A survivor lowers a raised weapon, ' +
  'arms open, and steps toward their infected partner. The two embrace ' +
  'as the frame hard match-cuts into a warm, sunlit memory of them ' +
  'together. No gore, no blood. Emotional, filmic lighting, gentle camera move.';

/**
 * 已知模型规格表。键为 SeeAPI 的 model id。
 *
 * 25 秒是硬性要求，因此这里只收录「单次可生成 ≥25 秒」的候选模型
 * （实测：其余模型上限 ≤20 秒）。
 * 价格来自 GET /v1/prices（720p，credits/秒）：
 *   grok-imagine-video 10 · wan-3-0 48 · wan-3-0-prime 68 · seedance-2-5 74
 */
export const VIDEO_SPECS: Record<string, VideoModelSpec> = {
  // 最省：30s 上限、10 credits/秒 → 25s ≈ 250 credits
  'grok-imagine-video': {
    model: 'grok-imagine-video',
    endpoint: 'image-to-video',
    imageMode: 'reference',
    referenceField: 'reference_images',
    durationField: 'duration_seconds',
    durationSeconds: 25,
    aspectField: 'aspect_ratio',
    resolutionField: 'resolution',
    resolution: '720p',
    extraInput: { mode: 'normal', nsfw_checker: true },
  },

  // 当前默认：首尾帧，48 credits/秒 → 25s = 1200 credits
  'wan-3-0': {
    model: 'wan-3-0',
    endpoint: 'image-to-video',
    provider: 'seeapi',
    imageMode: 'first-last',
    firstFrameField: 'first_frame_image',
    lastFrameField: 'last_frame_image',
    durationField: 'duration_seconds',
    durationSeconds: 25,
    aspectField: 'aspect_ratio',
    resolutionField: 'resolution',
    resolution: '720p',
  },

  // 同模型的高画质档，68 credits/秒 → 25s = 1700 credits
  'wan-3-0-prime': {
    model: 'wan-3-0-prime',
    endpoint: 'image-to-video',
    provider: 'seeapi',
    imageMode: 'first-last',
    firstFrameField: 'first_frame_image',
    lastFrameField: 'last_frame_image',
    durationField: 'duration_seconds',
    durationSeconds: 25,
    aspectField: 'aspect_ratio',
    resolutionField: 'resolution',
    resolution: '720p',
  },

  // 74 credits/秒 → 25s = 1850 credits
  'seedance-2-5': {
    model: 'seedance-2-5',
    endpoint: 'image-to-video',
    provider: 'seeapi',
    imageMode: 'first-last',
    firstFrameField: 'first_frame_image',
    lastFrameField: 'last_frame_image',
    durationField: 'duration_seconds',
    durationSeconds: 25,
    aspectField: 'aspect_ratio',
    resolutionField: 'resolution',
    resolution: '720p',
  },
};

/** 默认规格（当前线上行为：wan-3-0 / 首尾帧 / 25s）。 */
export const DEFAULT_VIDEO_SPEC: VideoModelSpec = VIDEO_SPECS['wan-3-0'];

/** 按 model id 解析规格；未知模型返回 null。 */
export function resolveVideoSpecFor(model: string): VideoModelSpec | null {
  return VIDEO_SPECS[model] ?? null;
}

/** 支持的模型 id 列表（用于报错提示与 CLI 帮助）。 */
export function listVideoModels(): string[] {
  return Object.keys(VIDEO_SPECS);
}

export interface BuildInputArgs {
  photoUrls: [string, string];
  aspectRatio: ZombieAspectRatio;
  prompt?: string;
  durationSeconds?: number;
  resolution?: string;
}

/**
 * 构造 SeeAPI `input` 对象。
 * photoUrls[0] 为幸存者，photoUrls[1] 为感染者。
 */
export function buildGenerationInput(
  spec: VideoModelSpec,
  args: BuildInputArgs
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: args.prompt ?? ZOMBIE_STORY_PROMPT,
  };

  if (spec.imageMode === 'reference') {
    if (!spec.referenceField) {
      throw new Error(`spec ${spec.model} 缺少 referenceField`);
    }
    input[spec.referenceField] = [...args.photoUrls];
  } else {
    if (!spec.firstFrameField) {
      throw new Error(`spec ${spec.model} 缺少 firstFrameField`);
    }
    input[spec.firstFrameField] = args.photoUrls[0];
    if (spec.lastFrameField) {
      input[spec.lastFrameField] = args.photoUrls[1];
    }
  }

  const duration = args.durationSeconds ?? spec.durationSeconds;
  if (spec.durationField && duration) {
    input[spec.durationField] = duration;
  }

  if (spec.resolutionField && (args.resolution ?? spec.resolution)) {
    input[spec.resolutionField] = args.resolution ?? spec.resolution;
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
