import { describe, expect, it, vi } from 'vitest';

import { createNotifier, notifyBackoffMs } from './notification';

const NOW = new Date('2026-06-01T00:00:00Z');
const clock = () => NOW;

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'zo_1',
    orderNo: 'ZLS-ABC',
    status: 'succeeded',
    notifyEmail: 'user@example.com',
    notifyStatus: 'pending',
    notifyAttempts: 0,
    notifyNextAt: null,
    videoUrl: 'https://cdn/v.mp4',
    downloadExpireAt: new Date(NOW.getTime() + 14 * 24 * 3600_000),
    ...overrides,
  };
}

function harness(order: any, mailOk: boolean, token: string | null = 'tok') {
  const updates: { patch: any }[] = [];
  const orderService = {
    updateStatus: vi.fn(async (_id: string, _to: string, patch: any) => {
      updates.push({ patch });
      return { ...order, ...patch };
    }),
    getDeliveryToken: vi.fn(async () => token),
  } as any;

  const mailer = {
    send: vi.fn(async () => ({
      ok: mailOk,
      error: mailOk ? undefined : 'smtp',
    })),
  };

  const notifier = createNotifier({
    orderService,
    mailer,
    clock,
    appUrl: 'https://zombie-love.com',
    buildEmail: ({ orderUrl }) => ({
      subject: 'ready',
      html: `<a href="${orderUrl}">open</a>`,
      text: orderUrl,
    }),
  });

  return { notifier, updates, orderService, mailer };
}

describe('notifyBackoffMs', () => {
  it('grows but stays bounded', () => {
    expect(notifyBackoffMs(5)).toBeLessThanOrEqual(60 * 60_000 * 1.2);
    expect(notifyBackoffMs(3)).toBeGreaterThanOrEqual(notifyBackoffMs(1));
  });
});

describe('notifier sendOne', () => {
  it('sends once and marks sent for a valid order', async () => {
    const { notifier, mailer, updates } = harness(makeOrder(), true);
    await notifier.sendOne(makeOrder());
    expect(mailer.send).toHaveBeenCalledOnce();
    expect(updates.at(-1)!.patch.notifyStatus).toBe('sent');
  });

  it('includes the private link with the delivery token', async () => {
    const { notifier, mailer } = harness(makeOrder(), true, 'tok123');
    await notifier.sendOne(makeOrder());
    const mail = mailer.send.mock.calls[0][0];
    expect(mail.html).toContain('tok123');
    expect(mail.html).toContain('zombie/order');
  });

  it('skips orders without an email', async () => {
    const { notifier, mailer, updates } = harness(
      makeOrder({ notifyEmail: null }),
      true
    );
    await notifier.sendOne(makeOrder({ notifyEmail: null }));
    expect(mailer.send).not.toHaveBeenCalled();
    expect(updates.at(-1)!.patch.notifyStatus).toBe('skipped');
  });

  it('keeps retrying (does not lose the order) when sending fails', async () => {
    const { notifier, updates } = harness(makeOrder(), false);
    await notifier.sendOne(makeOrder());
    const patch = updates.at(-1)!.patch;
    expect(patch.notifyStatus).toBe('retry_due');
    expect(patch.notifyAttempts).toBe(1);
    expect(new Date(patch.notifyNextAt).getTime()).toBeGreaterThan(
      NOW.getTime()
    );
  });

  it('gives up after the max attempts', async () => {
    const { notifier, updates } = harness(
      makeOrder({ notifyAttempts: 4 }),
      false
    );
    await notifier.sendOne(makeOrder({ notifyAttempts: 4 }));
    expect(updates.at(-1)!.patch.notifyStatus).toBe('skipped');
  });

  it('retries later (never lies) when no mailer is configured', async () => {
    const orderService = {
      updateStatus: vi.fn(
        async (_id: string, _to: string, patch: any) => patch
      ),
      getDeliveryToken: vi.fn(async () => 'tok'),
    } as any;
    const notifier = createNotifier({
      orderService,
      mailer: null,
      clock,
      appUrl: 'https://zombie-love.com',
      buildEmail: () => ({ subject: 's', html: 'h', text: 't' }),
    });
    await notifier.sendOne(makeOrder());
    const patch = orderService.updateStatus.mock.calls[0][2];
    expect(patch.notifyStatus).toBe('retry_due');
  });
});
