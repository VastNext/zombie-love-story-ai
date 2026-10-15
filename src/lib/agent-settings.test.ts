import { describe, expect, it } from 'vitest';

import {
  AGENT_MODEL_OPTIONS,
  aspectRatiosForModel,
  creditsForGeneration,
  defaultComposerSettings,
  durationsForModel,
  labelForGeneratedModel,
  normalizeClientGenerationSettings,
  providerModelFor,
  resolutionsForModel,
  resolveGenerationSettings,
  settingsForModel,
} from './agent-settings';

function expectedCredits(rate: number, seconds: number, multiplier = 1) {
  return Math.ceil((rate * seconds * multiplier) / 10) * 10;
}

describe('creditsForGeneration', () => {
  it('prices every model from its lite rate and default settings', () => {
    for (const option of AGENT_MODEL_OPTIONS) {
      expect(
        creditsForGeneration(
          option.value,
          option.defaultDuration,
          option.defaultResolution
        )
      ).toBe(expectedCredits(option.creditsPerSecond, option.defaultDuration));
    }
  });

  it('charges more for a longer clip', () => {
    for (const option of AGENT_MODEL_OPTIONS) {
      expect(
        creditsForGeneration(
          option.value,
          option.durationMax,
          option.defaultResolution
        )
      ).toBeGreaterThan(
        creditsForGeneration(
          option.value,
          option.durationMin,
          option.defaultResolution
        )
      );
    }
  });

  it('uses the same resolution multipliers as video-lite', () => {
    expect(creditsForGeneration('minimax-h3', 5, '768P')).toBe(
      expectedCredits(110, 5, 0.75)
    );
    expect(creditsForGeneration('minimax-h3', 5, '2K')).toBe(
      expectedCredits(110, 5)
    );
    expect(creditsForGeneration('minimax-h3', 5, '4K')).toBe(
      expectedCredits(110, 5, 1.5)
    );
  });

  it('clamps duration to the selected model range', () => {
    expect(creditsForGeneration('minimax-h3', 1, '2K')).toBe(
      creditsForGeneration('minimax-h3', 5, '2K')
    );
    expect(creditsForGeneration('minimax-h3', 99, '2K')).toBe(
      creditsForGeneration('minimax-h3', 15, '2K')
    );
  });

  it('uses the highest rate for an unknown key', () => {
    const rate = Math.max(
      ...AGENT_MODEL_OPTIONS.map((option) => option.creditsPerSecond)
    );
    const expected = expectedCredits(rate, 5);
    expect(creditsForGeneration('not-a-model', 5)).toBe(expected);
    expect(creditsForGeneration(undefined, 5)).toBe(expected);
    expect(creditsForGeneration('', 5)).toBe(expected);
  });
});

describe('composer model capabilities', () => {
  it('matches the current video-lite catalog in order', () => {
    expect(AGENT_MODEL_OPTIONS.map((option) => option.label)).toEqual([
      'MiniMax H3',
      'Seedance 2.5',
    ]);
  });

  it('starts with the video-lite defaults', () => {
    expect(defaultComposerSettings()).toEqual({
      modelOption: 'minimax-h3',
      duration: 5,
      resolution: '2K',
      aspectRatio: 'adaptive',
    });
  });

  it('exposes model-specific settings', () => {
    expect(durationsForModel('minimax-h3')).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(durationsForModel('seedance-2-5')).toHaveLength(27);
    expect(resolutionsForModel('minimax-h3')).toEqual(['768P', '2K', '4K']);
    expect(resolutionsForModel('seedance-2-5')).toEqual(['480p', '720p']);
    expect(aspectRatiosForModel('minimax-h3')).toContain('adaptive');
    expect(aspectRatiosForModel('seedance-2-5')).toContain('auto');
  });

  it('resets incompatible values when the model changes', () => {
    expect(
      settingsForModel(
        {
          modelOption: 'seedance-2-5',
          duration: 30,
          resolution: '720p',
          aspectRatio: 'auto',
        },
        'minimax-h3'
      )
    ).toEqual({
      modelOption: 'minimax-h3',
      duration: 5,
      resolution: '2K',
      aspectRatio: 'adaptive',
    });
  });
});

describe('resolveGenerationSettings', () => {
  it('sends the picker key and explicit lite defaults', () => {
    expect(resolveGenerationSettings(defaultComposerSettings())).toEqual({
      modelName: 'minimax-h3',
      aspectRatio: 'adaptive',
      resolution: '2K',
      duration: 5,
      creditCost: creditsForGeneration('minimax-h3', 5, '2K'),
    });
  });

  it('passes supported explicit settings through', () => {
    const settings = resolveGenerationSettings({
      modelOption: 'seedance-2-5',
      aspectRatio: '16:9',
      resolution: '480p',
      duration: 8,
    });
    expect(settings).toEqual({
      modelName: 'seedance-2-5',
      aspectRatio: '16:9',
      resolution: '480p',
      duration: 8,
      creditCost: creditsForGeneration('seedance-2-5', 8, '480p'),
    });
  });

  it('does not trust client pricing or unsupported values', () => {
    expect(
      normalizeClientGenerationSettings({
        modelName: 'seedance-2-5',
        duration: 99,
        resolution: '4K',
        aspectRatio: 'adaptive',
        creditCost: 0,
      })
    ).toEqual({
      modelName: 'seedance-2-5',
      duration: 30,
      aspectRatio: 'auto',
      resolution: '720p',
      creditCost: creditsForGeneration('seedance-2-5', 30, '720p'),
    });
    expect(
      normalizeClientGenerationSettings({ modelName: 'free-video' })
    ).toBeNull();
  });
});

describe('providerModelFor', () => {
  it('matches the current provider routes', () => {
    expect(providerModelFor('minimax-h3', 'grouter', 'generate', '2K')).toBe(
      'minimax-h3'
    );
    expect(providerModelFor('seedance-2-5', 'fal', 'animate', '720p')).toBe(
      'bytedance/seedance-2.5/image-to-video'
    );
    expect(providerModelFor('minimax-h3', 'fal', 'generate', '768P')).toBe(
      'fal-ai/minimax/hailuo-2.3/standard/text-to-video'
    );
    expect(providerModelFor('minimax-h3', 'fal', 'animate', '4K')).toBe(
      'fal-ai/minimax/hailuo-2.3/pro/image-to-video'
    );
  });

  it('does not downgrade Seedance on Replicate', () => {
    expect(
      providerModelFor('seedance-2-5', 'replicate', 'generate', '720p')
    ).toBeUndefined();
  });

  it('returns nothing for a model it cannot map', () => {
    expect(providerModelFor('not-a-model', 'fal', 'generate')).toBeUndefined();
    expect(providerModelFor(undefined, 'fal', 'generate')).toBeUndefined();
  });
});

describe('labelForGeneratedModel', () => {
  it('names picker and provider ids', () => {
    for (const option of AGENT_MODEL_OPTIONS) {
      expect(labelForGeneratedModel(option.value)).toBe(option.label);
      for (const ids of Object.values(option.providers)) {
        if (!ids) continue;
        expect(labelForGeneratedModel(ids.model)).toBe(option.label);
        expect(labelForGeneratedModel(ids.imageModel)).toBe(option.label);
      }
    }
    expect(
      labelForGeneratedModel('fal-ai/minimax/hailuo-2.3/pro/image-to-video')
    ).toBe('MiniMax H3');
  });

  it('shows the raw id for a model no longer sold', () => {
    expect(labelForGeneratedModel('retired/video-model')).toBe(
      'retired/video-model'
    );
  });
});
