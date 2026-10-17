import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getZombieRuntime } from '@/modules/zombie/runtime';
import { createZombieCheckoutSession } from '@/modules/zombie/stripe';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1500,
    keyPrefix: 'zombie-checkout',
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
    const accessToken =
      typeof body?.accessToken === 'string' ? body.accessToken : '';

    if (!orderId || !accessToken) return respErr('参数不完整');

    const runtime = await getZombieRuntime();

    // V1 模式下不开放收款
    if (runtime.mode !== 'live') {
      return respErr('收款尚未开放');
    }

    const order = await runtime.orderService.verifyAccess(orderId, accessToken);
    if (!order) return respErr('订单不存在或链接无效');
    if (order.status !== 'draft') {
      return respErr(`订单状态为 ${order.status}，无法再次支付`);
    }

    const appUrl = envConfigs.app_url || 'http://localhost:3000';
    const session = await createZombieCheckoutSession({
      orderId: order.id,
      orderNo: order.orderNo,
      aspectRatio: order.aspectRatio,
      priceCents: order.priceCents,
      currency: order.currency,
      email: order.notifyEmail,
      accessToken,
      appUrl,
    });

    await runtime.orderService.markCheckoutPending(order.id, session.sessionId);

    return respData({ checkoutUrl: session.url, sessionId: session.sessionId });
  } catch (error: any) {
    console.error('[zombie] checkout failed', error);
    return respErr(error?.message || '创建支付失败');
  }
}

export const Route = createFileRoute('/api/zombie/checkout')({
  server: { handlers: { POST } },
});
