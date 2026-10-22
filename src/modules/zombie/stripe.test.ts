import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createZombieCheckoutSession,
  resolveStripeConfig,
  verifyStripeWebhook,
} from './stripe';

const { configs, env, create } = vi.hoisted(() => ({
  configs: {} as Record<string, string>,
  env: {} as Record<string, string>,
  create: vi.fn(),
}));
vi.mock('@/config', () => ({ envConfigs: env }));
vi.mock('@/modules/config/service', () => ({
  getAllConfigs: async () => configs,
}));
vi.mock('stripe', async (original) => {
  const actual = await original<typeof import('stripe')>();
  class MockStripe extends actual.default {
    constructor(key: string, options: any) {
      super(key, options);
      this.checkout.sessions.create = create;
    }
  }
  return { default: MockStripe };
});

const args = {
  orderId: 'zo_test',
  orderNo: 'ZLS-test',
  aspectRatio: '9:16',
  priceCents: 499,
  currency: 'usd',
  accessToken: 'private-token',
  appUrl: 'https://example.com',
};

describe('Stripe 正式切换保护', () => {
  beforeEach(() => {
    for (const object of [configs, env])
      for (const key of Object.keys(object)) delete object[key];
    env.stripe_secret_key = 'sk_live_fixture';
    env.stripe_signing_secret = 'whsec_live_fixture';
    create.mockReset().mockResolvedValue({
      id: 'cs_fixture',
      url: 'https://checkout.stripe.com/fixture',
    });
  });

  it('正式环境变量不被数据库旧测试配置覆盖', async () => {
    configs.stripe_secret_key = 'sk_test_fixture';
    configs.stripe_signing_secret = 'whsec_test_fixture';
    expect(await resolveStripeConfig()).toMatchObject({
      secretKey: env.stripe_secret_key,
      signingSecret: env.stripe_signing_secret,
    });
  });

  it('支持正式受限密钥且同一订单使用固定幂等键', async () => {
    env.stripe_secret_key = 'rk_live_fixture';
    await createZombieCheckoutSession(args);
    expect(create).toHaveBeenCalledWith(expect.any(Object), {
      idempotencyKey: 'zombie-checkout-zo_test',
    });
  });

  it('回跳地址不向 Stripe 暴露私有访问令牌', async () => {
    await createZombieCheckoutSession(args);
    expect(create.mock.calls[0][0].success_url).toBe(
      'https://example.com/zombie/order#o=zo_test'
    );
  });

  it('切换后旧沙盒签名仍可验证，但不能签署正式事件', async () => {
    env.stripe_sandbox_signing_secret = 'whsec_old_fixture';
    const stripe = new Stripe('sk_test_fixture');
    for (const live of [false, true]) {
      const payload = JSON.stringify({
        id: 'evt_fixture',
        livemode: live,
        type: 'checkout.session.expired',
        data: { object: { livemode: live } },
      });
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: env.stripe_sandbox_signing_secret,
      });
      const event = await verifyStripeWebhook(payload, signature);
      expect(Boolean(event)).toBe(!live);
    }
  });
});
