import { createFileRoute } from '@tanstack/react-router';

import { getZombieRuntime } from '@/modules/zombie/runtime';
import { verifyStripeWebhook } from '@/modules/zombie/stripe';
import { respErr, respOk } from '@/lib/resp';

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
    if (!event) return respErr('Invalid signature');

    const runtime = await getZombieRuntime();
    const svc = runtime.orderService;

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as any;
      const paid =
        session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required';

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
          session.customer_details?.email ?? session.customer_email ?? null,
        paidAt: session.created ? new Date(session.created * 1000) : null,
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
    // 返回非 2xx 让 Stripe 重试
    return respErr(error?.message || 'Webhook handling failed');
  }
}

export const Route = createFileRoute('/api/zombie/webhook/stripe')({
  server: { handlers: { POST } },
});
