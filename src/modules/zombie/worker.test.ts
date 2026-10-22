import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_VIDEO_SPEC } from './video-spec';
import { backoffMs, createWorker } from './worker';

const NOW = new Date('2026-05-01T00:00:00Z');
const clock = () => NOW;

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'zo_1',
    status: 'queued',
    aspectRatio: '9:16',
    photo1Key: 'zombie/orders/zo_1/photo1',
    photo2Key: 'zombie/orders/zo_1/photo2',
    attempts: 0,
    idempotencyKey: 'key-1',
    nextAttemptAt: null,
    leaseOwner: null,
    leaseUntil: null,
    ...overrides,
  };
}

function makeHarness(order: any, seeapiResult: any, getResult?: any) {
  const updates: { to: string; patch: any }[] = [];
  const orderService = {
    updateStatus: vi.fn(async (_id: string, to: string, patch: any) => {
      updates.push({ to, patch });
      return { ...order, ...patch, status: to };
    }),
    markSucceeded: vi.fn(async (_id: string, asset: any) => {
      updates.push({ to: 'succeeded', patch: asset });
      return { ...order, status: 'succeeded', videoUrl: asset.url };
    }),
  } as any;

  const seeapi = {
    createGeneration: vi.fn(async () => seeapiResult),
    getGeneration: vi.fn(async () => getResult),
  } as any;

  const worker = createWorker({
    orderService,
    seeapi,
    clock,
    spec: DEFAULT_VIDEO_SPEC,
    resolvePhotoUrl: async (key: string) => `https://signed/${key}`,
  });

  return { worker, updates, orderService, seeapi };
}

describe('backoffMs', () => {
  it('grows with attempts and stays bounded', () => {
    const first = backoffMs(1);
    const later = backoffMs(6);
    expect(later).toBeGreaterThanOrEqual(first);
    expect(backoffMs(50)).toBeLessThanOrEqual(30 * 60_000 * 1.2);
  });
});

describe('worker step — submission', () => {
  it('never submits a sandbox payment for generation', async () => {
    const order = makeOrder({ status: 'paid', source: 'stripe_sandbox' });
    const { worker, seeapi, updates } = makeHarness(order, {
      ok: true,
      taskId: 't',
    });
    await worker.step(order);
    expect(seeapi.createGeneration).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });
  it('advances a paid order to queued and submits within the same tick', async () => {
    const order = makeOrder({ status: 'paid' });
    const { worker, seeapi, updates } = makeHarness(order, {
      ok: true,
      taskId: 'task_paid',
    });
    await worker.step(order);

    expect(updates[0].to).toBe('queued');
    expect(seeapi.createGeneration).toHaveBeenCalledOnce();
    const submitted = updates.find((u) => u.to === 'submitted');
    expect(submitted?.patch.taskId).toBe('task_paid');
    // 提交必须带幂等键，重试才会复用同一任务
    expect(submitted?.patch.errorCode).toBeNull();
  });

  it('submits a queued order and stores the task id', async () => {
    const order = makeOrder();
    const { worker, seeapi, updates } = makeHarness(order, {
      ok: true,
      taskId: 'task_9',
      status: 'processing',
    });
    await worker.step(order);

    expect(seeapi.createGeneration).toHaveBeenCalledOnce();
    const submitted = updates.find((u) => u.to === 'submitted');
    expect(submitted?.patch.taskId).toBe('task_9');
  });

  it('resolves both photo keys to signed URLs', async () => {
    const order = makeOrder();
    const { worker, seeapi } = makeHarness(order, { ok: true, taskId: 't' });
    await worker.step(order);
    const input = seeapi.createGeneration.mock.calls[0][0].input;
    expect(input.first_frame_image).toContain('photo1');
    expect(input.last_frame_image).toContain('photo2');
  });

  it('retries with backoff on 429, staying queued', async () => {
    const order = makeOrder();
    const { worker, updates } = makeHarness(order, {
      ok: false,
      kind: 'rate_limited',
      message: 'slow down',
    });
    await worker.step(order);
    const last = updates.at(-1)!;
    expect(last.to).toBe('queued');
    expect(last.patch.errorCode).toBe('rate_limited');
    expect(new Date(last.patch.nextAttemptAt).getTime()).toBeGreaterThan(
      NOW.getTime()
    );
  });

  it('marks failed_needs_attention on insufficient credits', async () => {
    const order = makeOrder();
    const { worker, updates } = makeHarness(order, {
      ok: false,
      kind: 'insufficient_credits',
      message: 'no credits',
    });
    await worker.step(order);
    expect(updates.at(-1)!.to).toBe('failed_needs_attention');
  });

  it('fails fast when photos are missing', async () => {
    const order = makeOrder({ photo1Key: null });
    const { worker, seeapi, updates } = makeHarness(order, {
      ok: true,
      taskId: 't',
    });
    await worker.step(order);
    expect(seeapi.createGeneration).not.toHaveBeenCalled();
    expect(updates.at(-1)!.to).toBe('failed_needs_attention');
    expect(updates.at(-1)!.patch.errorCode).toBe('missing_photos');
  });

  it('does not submit while generation is paused', async () => {
    const order = makeOrder();
    const updates: any[] = [];
    const seeapi = { createGeneration: vi.fn(), getGeneration: vi.fn() } as any;
    const worker = createWorker({
      orderService: {
        updateStatus: vi.fn(async (_id: string, to: string, patch: any) => {
          updates.push({ to, patch });
          return { ...order, ...patch, status: to };
        }),
        markSucceeded: vi.fn(),
      } as any,
      seeapi,
      clock,
      generationPaused: true,
      resolvePhotoUrl: async () => 'https://signed/x',
    });
    await worker.step(order);
    expect(seeapi.createGeneration).not.toHaveBeenCalled();
    expect(updates.at(-1)!.to).toBe('queued');
  });
});

describe('worker step — polling', () => {
  it('keeps processing orders in processing with a future retry', async () => {
    const order = makeOrder({ status: 'submitted', taskId: 'task_1' });
    const { worker, updates } = makeHarness(order, null, {
      ok: true,
      status: 'processing',
      assets: [],
    });
    await worker.step(order);
    expect(updates.at(-1)!.to).toBe('processing');
  });

  it('stores the video and completes on success', async () => {
    const order = makeOrder({ status: 'processing', taskId: 'task_1' });
    const { worker, orderService } = makeHarness(order, null, {
      ok: true,
      status: 'succeeded',
      assets: [{ type: 'video', url: 'https://cdn/v.mp4', asset_id: 'a1' }],
    });
    await worker.step(order);
    expect(orderService.markSucceeded).toHaveBeenCalledOnce();
    expect(orderService.markSucceeded.mock.calls[0][1].url).toBe(
      'https://cdn/v.mp4'
    );
  });

  it('fails when upstream reports success but returns no video', async () => {
    const order = makeOrder({ status: 'processing', taskId: 'task_1' });
    const { worker, orderService, updates } = makeHarness(order, null, {
      ok: true,
      status: 'succeeded',
      assets: [{ type: 'image', url: 'https://cdn/cover.png' }],
    });
    await worker.step(order);
    expect(orderService.markSucceeded).not.toHaveBeenCalled();
    expect(updates.at(-1)!.to).toBe('failed_needs_attention');
    expect(updates.at(-1)!.patch.errorCode).toBe('no_video_asset');
  });

  it('maps upstream failure states to needs-attention', async () => {
    const order = makeOrder({ status: 'processing', taskId: 'task_1' });
    const { worker, updates } = makeHarness(order, null, {
      ok: true,
      status: 'failed',
      assets: [],
    });
    await worker.step(order);
    expect(updates.at(-1)!.to).toBe('failed_needs_attention');
    expect(updates.at(-1)!.patch.errorCode).toBe('upstream_failed');
  });
});
