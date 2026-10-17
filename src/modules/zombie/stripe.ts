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
  const secretKey = configs.stripe_secret_key || envConfigs.stripe_secret_key;
  const signingSecret =
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
  /** 用户端持有的访问令牌，用于回跳后打开私有订单页 */
  accessToken: string;
  appUrl: string;
}

export async function createZombieCheckoutSession(
  args: CreateCheckoutArgs
): Promise<{ url: string; sessionId: string }> {
  const config = await resolveStripeConfig();
  if (!config) throw new Error('Stripe 未配置');

  const stripe = buildClient(config.secretKey);

  const returnHash = `#o=${encodeURIComponent(args.orderId)}&t=${encodeURIComponent(args.accessToken)}`;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: args.currency,
          unit_amount: args.priceCents,
          product_data: {
            name: `Zombie Love Story — ${args.aspectRatio}`,
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
    success_url: `${args.appUrl}/zombie/order${returnHash}`,
    cancel_url: `${args.appUrl}/#pricing`,
  });

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
  if (!config || !config.signingSecret || !signature) return null;

  try {
    const stripe = buildClient(config.secretKey);
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.signingSecret
    );
  } catch (error) {
    console.error('[zombie] stripe signature verification failed', error);
    return null;
  }
}

export { Stripe };
