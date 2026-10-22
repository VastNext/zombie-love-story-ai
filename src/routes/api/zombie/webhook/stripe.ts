import { createFileRoute } from '@tanstack/react-router';

import { getZombieRuntime } from '@/modules/zombie/runtime';
import { verifyStripeWebhook } from '@/modules/zombie/stripe';
import { respOk } from '@/lib/resp';

/**
 * Stripe 依赖非 2xx 才会重试。任何处理失败都必须回 5xx，
 * 否则一次数据库抖动就会静默丢单。
 */
function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Stripe webhook（仅处理 Zombie 订单）。
 *
 * 幂等策略：以 Checkout Session 唯一约束为准，重复事件最多把订单标记一次 paid。
 * 这里**不做** SeeAPI 提交、不发邮件——只改状态，让 worker 后续推进。
 */
async function POST({ request }: { request: Request }) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    const event = await verifyStripeWebhook(rawBody, signature);
    // 签名不对：请求本身无效，用 400 而不是 200（也不要 5xx，免得无意义重试）
    if (!event) return fail('Invalid signature', 400);

    const runtime = await getZombieRuntime();
    const svc = runtime.orderService;

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as any;
      const matched = await svc.getByStripeSession(session.id);
      if (!matched && session.metadata?.zombieOrderId) {
        // Checkout 建立与写入 Session ID 之间可能收到 webhook；让 Stripe 稍后重试。
        return fail('订单尚未关联支付会话', 500);
      }
      if (
        matched &&
        (matched.source === 'stripe_sandbox') !== (session.livemode === false)
      ) {
        return fail('支付会话与订单环境不匹配', 400);
      }
      const paid = session.payment_status === 'paid';

      if (!paid) {
        // 延迟支付方式：等 async_payment_succeeded
        return respOk();
      }

      const { order, alreadyPaid } = await svc.markPaidBySession(session.id, {
        paymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
        email:
          matched?.source === 'stripe_sandbox'
            ? null
            : (session.customer_details?.email ??
              session.customer_email ??
              null),
        paidAt: null,
      });

      if (!order) {
        // 非本产品订单：直接 2xx，避免 Stripe 反复重试
        console.log('[zombie] stripe event for unknown session', session.id);
        return respOk();
      }

      console.log(
        `[zombie] stripe ${event.type} order=${order.orderNo} alreadyPaid=${alreadyPaid}`
      );
      return respOk();
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as any;
      const order = await svc.getByStripeSession(session.id);
      if (order && order.status === 'checkout_pending') {
        await svc.updateStatus(order.id, 'canceled', {
          errorCode: 'async_payment_failed',
        });
      }
      return respOk();
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as any;
      const order = await svc.getByStripeSession(session.id);
      if (order && order.status === 'checkout_pending') {
        await svc.updateStatus(order.id, 'canceled', {
          errorCode: 'checkout_expired',
        });
      }
      return respOk();
    }

    return respOk();
  } catch (error: any) {
    console.error('[zombie] stripe webhook failed', error);
    // 返回 5xx 让 Stripe 重试，避免丢单
    return fail(error?.message || 'Webhook handling failed', 500);
  }
}

export const Route = createFileRoute('/api/zombie/webhook/stripe')({
  server: { handlers: { POST } },
});
