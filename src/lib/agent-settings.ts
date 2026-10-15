/** The video backends an admin can route generation through. */
export type VideoProviderName = 'grouter' | 'fal' | 'replicate';

export interface AgentGenerationSettings {
  /** Picker key (`minimax-h3`) — resolved to a provider model server-side. */
  modelName?: string;
  aspectRatio?: string;
  resolution?: string;
  /** Clip length in seconds. */
  duration?: number;
  creditCost?: number;
}

export const AUTO_ASPECT_RATIO = 'auto';
export const ADAPTIVE_ASPECT_RATIO = 'adaptive';
export const AUTO_RESOLUTION = 'auto';
export const DEFAULT_RESOLUTION = '2K';
export const DEFAULT_DURATION = 5;

/**
 * Video Agent uses the same public catalog as shipany-video-lite. Keep model
 * capabilities, defaults, provider routes and prices aligned with that app so
 * a setting selected in the composer has the same meaning in both products.
 */
export const AGENT_MODEL_OPTIONS = [
  {
    value: 'minimax-h3',
    label: 'MiniMax H3',
    creditsPerSecond: 110,
    autoBillingSeconds: 5,
    resolutionCreditMultipliers: {
      '768P': 0.75,
      '2K': 1,
      '4K': 1.5,
    },
    durations: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    defaultDuration: 5,
    durationMin: 5,
    durationMax: 15,
    supportsAutoDuration: false,
    resolutions: ['768P', '2K', '4K'],
    defaultResolution: '2K',
    aspectRatios: ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    defaultAspectRatio: 'adaptive',
    audio: false,
    maxImages: 1,
    providers: {
      grouter: {
        model: 'minimax-h3',
        imageModel: 'minimax-h3',
      },
      fal: {
        model: 'fal-ai/minimax/hailuo-2.3/standard/text-to-video',
        imageModel: 'fal-ai/minimax/hailuo-2.3/standard/image-to-video',
      },
      replicate: {
        model: 'minimax/hailuo-2.3',
        imageModel: 'minimax/hailuo-2.3',
      },
    },
  },
  {
    value: 'seedance-2-5',
    label: 'Seedance 2.5',
    creditsPerSecond: 200,
    autoBillingSeconds: 5,
    resolutionCreditMultipliers: {
      '480p': 0.75,
      '720p': 1,
    },
    durations: [
      4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      24, 25, 26, 27, 28, 29, 30,
    ],
    defaultDuration: 5,
    durationMin: 4,
    durationMax: 30,
    supportsAutoDuration: false,
    resolutions: ['480p', '720p'],
    defaultResolution: '720p',
    aspectRatios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    defaultAspectRatio: 'auto',
    audio: true,
    maxImages: 2,
    providers: {
      grouter: {
        model: 'seedance-2.5',
        imageModel: 'seedance-2.5',
      },
      fal: {
        model: 'bytedance/seedance-2.5/text-to-video',
        imageModel: 'bytedance/seedance-2.5/image-to-video',
      },
      // shipany-video-lite deliberately leaves this unsupported instead of
      // silently substituting an older Seedance model.
      replicate: null,
    },
  },
] as const;

export type AgentModelOptionValue =
  (typeof AGENT_MODEL_OPTIONS)[number]['value'];

export const AGENT_DURATIONS = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30,
] as const;

export const AGENT_ASPECT_RATIOS = [
  AUTO_ASPECT_RATIO,
  ADAPTIVE_ASPECT_RATIO,
  '21:9',
  '16:9',
  '4:3',
  '1:1',
  '3:4',
  '9:16',
] as const;

export const AGENT_RESOLUTIONS = [
  { value: '768P', label: '768P' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
] as const;

export interface AgentComposerSettings {
  modelOption: AgentModelOptionValue;
  aspectRatio: string;
  resolution: string;
  duration: number;
}

export function modelOptionFor(value: string | undefined) {
  return AGENT_MODEL_OPTIONS.find((item) => item.value === value);
}

export function isModelOptionValue(
  value: string | undefined
): value is AgentModelOptionValue {
  return !!modelOptionFor(value);
}

export function durationsForModel(
  value: string | undefined
): readonly number[] {
  return modelOptionFor(value)?.durations ?? [DEFAULT_DURATION];
}

export function aspectRatiosForModel(
  value: string | undefined
): readonly string[] {
  return modelOptionFor(value)?.aspectRatios ?? [ADAPTIVE_ASPECT_RATIO];
}

export function resolutionsForModel(
  value: string | undefined
): readonly string[] {
  return modelOptionFor(value)?.resolutions ?? [DEFAULT_RESOLUTION];
}

export function isAutoAspectRatio(value: string): boolean {
  return value === AUTO_ASPECT_RATIO || value === ADAPTIVE_ASPECT_RATIO;
}

export function isAspectRatioValue(value: unknown): value is string {
  return AGENT_ASPECT_RATIOS.some((ratio) => ratio === value);
}

export function isResolutionValue(value: unknown): value is string {
  return AGENT_RESOLUTIONS.some((item) => item.value === value);
}

export function isDurationValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    AGENT_DURATIONS.some((seconds) => seconds === value)
  );
}

/** Match video-lite: continuous integer duration, clamped to model bounds. */
export function normalizeDurationForModel(
  modelKey: string | undefined,
  value: unknown
): number {
  const option = modelOptionFor(modelKey);
  if (!option) return DEFAULT_DURATION;
  const requested =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value)
      : option.defaultDuration;
  return Math.min(option.durationMax, Math.max(option.durationMin, requested));
}

/** Reset values that are invalid for the newly selected model. */
export function settingsForModel(
  settings: AgentComposerSettings,
  modelKey: AgentModelOptionValue
): AgentComposerSettings {
  const option = modelOptionFor(modelKey);
  if (!option) return defaultComposerSettings();

  // video-lite resets all controls to the new model's defaults when the
  // picker changes, even when an old value happens to be supported by both.
  if (settings.modelOption !== modelKey) {
    return {
      modelOption: modelKey,
      duration: option.defaultDuration,
      aspectRatio: option.defaultAspectRatio,
      resolution: option.defaultResolution,
    };
  }

  return {
    modelOption: modelKey,
    duration: normalizeDurationForModel(modelKey, settings.duration),
    aspectRatio: (option.aspectRatios as readonly string[]).includes(
      settings.aspectRatio
    )
      ? settings.aspectRatio
      : option.defaultAspectRatio,
    resolution: (option.resolutions as readonly string[]).includes(
      settings.resolution
    )
      ? settings.resolution
      : option.defaultResolution,
  };
}

export function defaultComposerSettings(): AgentComposerSettings {
  const option = AGENT_MODEL_OPTIONS[0];
  return {
    modelOption: option.value,
    aspectRatio: option.defaultAspectRatio,
    resolution: option.defaultResolution,
    duration: option.defaultDuration,
  };
}

export function resolveGenerationSettings(
  settings: AgentComposerSettings
): AgentGenerationSettings {
  const normalized = settingsForModel(settings, settings.modelOption);
  return {
    modelName: normalized.modelOption,
    aspectRatio: normalized.aspectRatio,
    resolution: normalized.resolution,
    duration: normalized.duration,
    creditCost: creditsForGeneration(
      normalized.modelOption,
      normalized.duration,
      normalized.resolution
    ),
  };
}

/** Validate settings from the API request against the server catalog. */
export function normalizeClientGenerationSettings(
  settings: AgentGenerationSettings | undefined
): AgentGenerationSettings | null {
  const defaults = defaultComposerSettings();
  const modelOption = settings?.modelName ?? defaults.modelOption;
  if (!isModelOptionValue(modelOption)) return null;

  return resolveGenerationSettings(
    settingsForModel(
      {
        modelOption,
        aspectRatio: settings?.aspectRatio ?? defaults.aspectRatio,
        resolution: settings?.resolution ?? defaults.resolution,
        duration:
          typeof settings?.duration === 'number'
            ? settings.duration
            : defaults.duration,
      },
      modelOption
    )
  );
}

/** Same price formula and resolution multipliers as shipany-video-lite. */
export function creditsForGeneration(
  modelKey: string | undefined,
  durationSeconds?: number,
  resolution?: string
): number {
  const option = modelOptionFor(modelKey);
  const highestRate = Math.max(
    ...AGENT_MODEL_OPTIONS.map((item) => item.creditsPerSecond)
  );
  const seconds = option
    ? normalizeDurationForModel(option.value, durationSeconds)
    : Number.isFinite(durationSeconds) && Number(durationSeconds) > 0
      ? Math.round(Number(durationSeconds))
      : DEFAULT_DURATION;
  const rate = option?.creditsPerSecond ?? highestRate;
  const multiplier = option
    ? ((option.resolutionCreditMultipliers as Record<string, number>)[
        resolution ?? option.defaultResolution
      ] ?? 1)
    : 1;
  return Math.ceil((rate * seconds * multiplier) / 10) * 10;
}

/** Friendly name for a picker key or a provider id recorded on a task. */
export function labelForGeneratedModel(modelId: string): string {
  const option = AGENT_MODEL_OPTIONS.find(
    (item) =>
      item.value === modelId ||
      Object.values(item.providers).some(
        (ids) =>
          ids !== null && (ids.model === modelId || ids.imageModel === modelId)
      ) ||
      (item.value === 'minimax-h3' &&
        modelId.startsWith('fal-ai/minimax/hailuo-2.3/'))
  );
  return option?.label ?? modelId;
}

export function labelForModelOption(value: string) {
  return modelOptionFor(value)?.label || 'Auto';
}

/** Resolve the exact provider route used by video-lite. */
export function providerModelFor(
  modelKey: string | undefined,
  provider: VideoProviderName,
  kind: 'generate' | 'animate',
  resolution?: string
): string | undefined {
  const option = modelOptionFor(modelKey);
  if (!option) return undefined;
  if (provider === 'fal' && option.value === 'minimax-h3') {
    const tier = resolution === '768P' ? 'standard' : 'pro';
    const mode = kind === 'animate' ? 'image-to-video' : 'text-to-video';
    return `fal-ai/minimax/hailuo-2.3/${tier}/${mode}`;
  }
  const ids = option.providers[provider];
  if (!ids) return undefined;
  return kind === 'animate' ? ids.imageModel : ids.model;
}
