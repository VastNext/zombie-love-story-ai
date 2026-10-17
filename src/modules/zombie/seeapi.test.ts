import { describe, expect, it, vi } from 'vitest';

import { createSeeApiClient } from './seeapi';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const createParams = {
  model: 'wan-3-0',
  endpoint: 'image-to-video',
  input: { first_frame_image: 'a', last_frame_image: 'b' },
  idempotencyKey: 'key-1',
};

describe('createGeneration', () => {
  it('returns the task id on 202 without treating it as finished', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ generation: { id: 'task_1', status: 'processing' } }, 202)
    );
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: fetchMock as any,
    });
    const result = await client.createGeneration(createParams);
    expect(result).toMatchObject({
      ok: true,
      taskId: 'task_1',
      status: 'processing',
    });
  });

  it('sends the idempotency key and bearer token', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ generation: { id: 'task_1' } }, 202)
    );
    const client = createSeeApiClient({
      apiKey: 'secret',
      fetch: fetchMock as any,
    });
    await client.createGeneration(createParams);

    const [, init] = fetchMock.mock.calls[0] as any;
    expect(init.headers['Idempotency-Key']).toBe('key-1');
    expect(init.headers.Authorization).toBe('Bearer secret');
  });

  it('classifies 402 as insufficient credits', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () => jsonResponse({ message: 'no credits' }, 402)) as any,
    });
    const result = await client.createGeneration(createParams);
    expect(result).toMatchObject({ ok: false, kind: 'insufficient_credits' });
  });

  it('classifies 429 as rate limited and surfaces Retry-After', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () =>
        new Response('{}', {
          status: 429,
          headers: { 'retry-after': '3' },
        })) as any,
    });
    const result = await client.createGeneration(createParams);
    expect(result).toMatchObject({
      ok: false,
      kind: 'rate_limited',
      retryAfterMs: 3000,
    });
  });

  it('classifies 503 as unavailable (retryable)', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () => jsonResponse({}, 503)) as any,
    });
    const result = await client.createGeneration(createParams);
    expect(result).toMatchObject({ ok: false, kind: 'unavailable' });
  });

  it('classifies 401 as auth (not retryable)', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () => jsonResponse({}, 401)) as any,
    });
    const result = await client.createGeneration(createParams);
    expect(result).toMatchObject({ ok: false, kind: 'auth' });
  });

  it('reports network failures as unavailable', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () => {
        throw new Error('boom');
      }) as any,
    });
    const result = await client.createGeneration(createParams);
    expect(result).toMatchObject({ ok: false, kind: 'unavailable' });
  });

  it('fails when the response carries no task id', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () => jsonResponse({ generation: {} }, 202)) as any,
    });
    const result = await client.createGeneration(createParams);
    expect(result).toMatchObject({ ok: false, kind: 'unknown' });
  });
});

describe('getGeneration', () => {
  it('returns assets only after success', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () =>
        jsonResponse({
          generation: {
            id: 'task_1',
            status: 'succeeded',
            result: { assets: [{ type: 'video', url: 'https://x/v.mp4' }] },
          },
        })) as any,
    });
    const result = await client.getGeneration('task_1');
    expect(result).toMatchObject({ ok: true, status: 'succeeded' });
    if (result.ok) expect(result.assets).toHaveLength(1);
  });

  it('keeps processing distinct from success', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () =>
        jsonResponse({ generation: { id: 't', status: 'processing' } })) as any,
    });
    const result = await client.getGeneration('t');
    expect(result).toMatchObject({ ok: true, status: 'processing' });
    if (result.ok) expect(result.assets).toEqual([]);
  });

  it('surfaces terminal failure states', async () => {
    const client = createSeeApiClient({
      apiKey: 'k',
      fetch: (async () =>
        jsonResponse({ generation: { id: 't', status: 'failed' } })) as any,
    });
    const result = await client.getGeneration('t');
    expect(result).toMatchObject({ ok: true, status: 'failed' });
  });
});
