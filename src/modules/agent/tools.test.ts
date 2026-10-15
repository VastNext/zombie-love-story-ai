import { describe, expect, it } from 'vitest';

import {
  durationSeconds,
  normalizeProviderAspectRatio,
  pickVideoProvider,
  resolveReferenceImage,
} from './tools';

describe('resolveReferenceImage', () => {
  it('passes absolute URLs through untouched', () => {
    for (const url of [
      'https://cdn.example.com/a.png',
      'http://cdn.example.com/a.png',
      'HTTPS://CDN.EXAMPLE.COM/A.PNG',
    ]) {
      expect(resolveReferenceImage(url)).toBe(url);
    }
  });

  it('passes data URIs through untouched', () => {
    const uri = 'data:image/png;base64,iVBORw0KGgo=';
    expect(resolveReferenceImage(uri)).toBe(uri);
  });

  it('rejects site-relative paths that were not published by the composer', () => {
    expect(() => resolveReferenceImage('/imgs/examples/a.webp')).toThrow(
      /unsupported image reference/
    );
  });

  it('rejects absolute localhost URLs', () => {
    for (const local of [
      'http://localhost:3000/a.png',
      'http://127.0.0.1/a.png',
      'http://0.0.0.0/a.png',
      'http://[::1]/a.png',
    ]) {
      expect(() => resolveReferenceImage(local)).toThrow(
        /unsupported image reference/
      );
    }
  });

  it('rejects a protocol-relative URL', () => {
    // `//elsewhere/x` looks relative but resolves off-site.
    expect(() => resolveReferenceImage('//elsewhere.com/a.png')).toThrow(
      /unsupported image reference/
    );
  });

  it('rejects anything else', () => {
    for (const bad of ['a.png', 'file:///etc/passwd', '../secret.png', '']) {
      expect(() => resolveReferenceImage(bad)).toThrow(
        /unsupported image reference/
      );
    }
  });

  it('trims surrounding whitespace before deciding', () => {
    expect(resolveReferenceImage('  https://cdn.example.com/a.png  ')).toBe(
      'https://cdn.example.com/a.png'
    );
  });
});

describe('normalizeProviderAspectRatio', () => {
  it('turns MiniMax adaptive mode into a concrete upstream ratio', () => {
    expect(normalizeProviderAspectRatio('minimax-h3', 'adaptive')).toBe('16:9');
  });

  it('preserves concrete MiniMax and Seedance ratios', () => {
    expect(normalizeProviderAspectRatio('minimax-h3', '9:16')).toBe('9:16');
    expect(normalizeProviderAspectRatio('seedance-2-5', 'auto')).toBe('auto');
  });
});

describe('durationSeconds', () => {
  it('prefers what the tool call asked for', () => {
    expect(durationSeconds(10, 5, 'minimax-h3')).toBe(10);
  });

  it('falls back to the composer setting', () => {
    expect(durationSeconds(undefined, 10, 'minimax-h3')).toBe(10);
  });

  it('uses the selected model default for non-numeric lengths', () => {
    for (const bad of [NaN, 'soon', null]) {
      expect(durationSeconds(bad, undefined, 'minimax-h3')).toBe(5);
    }
  });

  it('clamps lengths to the selected model range', () => {
    expect(durationSeconds(1, undefined, 'minimax-h3')).toBe(5);
    expect(durationSeconds(99, undefined, 'minimax-h3')).toBe(15);
    expect(durationSeconds(99, undefined, 'seedance-2-5')).toBe(30);
  });
});

describe('pickVideoProvider', () => {
  it('returns null when nothing is configured', () => {
    expect(pickVideoProvider({})).toBeNull();
  });

  it('prefers gRouter when auto and all are configured', () => {
    expect(
      pickVideoProvider({
        grouter_api_key: 'g',
        grouter_base_url: 'https://gateway.example.com',
        fal_api_key: 'k',
        replicate_api_token: 't',
      })
    ).toBe('grouter');
  });

  it('honours an explicit preference', () => {
    expect(
      pickVideoProvider({
        default_video_provider: 'replicate',
        fal_api_key: 'k',
        replicate_api_token: 't',
      })
    ).toBe('replicate');
  });

  it('falls back when the preferred provider has no credentials', () => {
    // A stale preference shouldn't take down generation that could still run.
    expect(
      pickVideoProvider({
        default_video_provider: 'replicate',
        fal_api_key: 'k',
      })
    ).toBe('fal');
  });
});
