/**
 * Zombie 订单专用的 Stripe 封装。
 *
 * 不复用通用结账链路（那条路会创建 order 行并发放 credits），
 * 只创建一次性 Checkout Session，并在 webhook 中标记本产品订单。
 */

import Stripe from 'stripe';

import { envConfigs } from '@/config';
import { getAllConfigs } from '@/modules/config/service';

export interface StripeConfig {
  secretKey: string;
  signingSecret: string;
}

export async function resolveStripeConfig(): Promise<StripeConfig | null> {
  const configs = (await getAllConfigs()) as Record<string, string>;
  const secretKey = envConfigs.stripe_secret_key || configs.stripe_secret_key;
  const signingSecret =
    envConfigs.stripe_signing_secret ||
    configs.stripe_signing_secret ||
    (configs as Record<string, string>).stripe_webhook_secret ||
    envConfigs.stripe_signing_secret;
  if (!secretKey) return null;
  return { secretKey, signingSecret: signingSecret || '' };
}

function buildClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export interface CreateCheckoutArgs {
  orderId: string;
  orderNo: string;
  aspectRatio: string;
  priceCents: number;
  currency: string;
  email?: string | null;
  appUrl: string;
  sandbox?: boolean;
}

export async function createZombieCheckoutSession(
  args: CreateCheckoutArgs
): Promise<{ url: string; sessionId: string }> {
  const config = await resolveStripeConfig();
  if (!config) throw new Error('Stripe 未配置');
  if (args.sandbox && !/^(sk|rk)_test_/.test(config.secretKey)) {
    throw new Error('沙盒支付必须配置 Stripe 测试密钥');
  }
  if (!args.sandbox && !/^(sk|rk)_live_/.test(config.secretKey)) {
    throw new Error('正式支付必须配置 Stripe 正式密钥');
  }

  const stripe = buildClient(config.secretKey);

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: args.currency,
            unit_amount: args.priceCents,
            product_data: {
              name: `Zombie Love Story — ${args.aspectRatio}`,
              tax_code: 'txcd_10000000',
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: args.orderId,
      metadata: { zombieOrderId: args.orderId, zombieOrderNo: args.orderNo },
      payment_intent_data: {
        metadata: { zombieOrderId: args.orderId },
      },
      ...(args.email ? { customer_email: args.email } : {}),
      success_url: `${args.appUrl}/zombie/order#o=${encodeURIComponent(args.orderId)}`,
      cancel_url: `${args.appUrl}/#pricing`,
    },
    { idempotencyKey: `zombie-checkout-${args.orderId}` }
  );

  if (!session.id || !session.url) {
    throw new Error('创建 Stripe 收银台失败');
  }
  return { url: session.url, sessionId: session.id };
}

/** 校验 Stripe webhook 签名（需要原始请求体，不能先解析 JSON）。 */
export async function verifyStripeWebhook(
  rawBody: string,
  signature: string | null
): Promise<Stripe.Event | null> {
  const config = await resolveStripeConfig();
  if (!config || !signature) return null;
  const stripe = buildClient(config.secretKey);
  const secrets = [
    { secret: envConfigs.stripe_live_signing_secret, live: true },
    {
      secret: config.signingSecret,
      live: envConfigs.stripe_live_signing_secret
        ? false
        : /^(sk|rk)_live_/.test(config.secretKey),
    },
    { secret: envConfigs.stripe_sandbox_signing_secret, live: false },
  ];
  for (const { secret, live } of secrets) {
    if (!secret) continue;
    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      if (event.livemode === live) return event;
    } catch {
      // 旧沙盒与正式端点分别验签；不记录可能包含私人数据的原始事件。
    }
  }
  return null;
}

export { Stripe };
