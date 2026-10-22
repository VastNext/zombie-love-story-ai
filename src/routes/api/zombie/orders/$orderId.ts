import { createFileRoute } from '@tanstack/react-router';

import { getZombieRuntime } from '@/modules/zombie/runtime';
import {
  isWithinDownloadWindow,
  type ZombieOrderStatus,
} from '@/modules/zombie/types';
import { respData, respErr } from '@/lib/resp';

const WORKABLE: ZombieOrderStatus[] = [
  'paid',
  'queued',
  'submitted',
  'processing',
];

/** 对外可见的订单视图：绝不暴露 taskId、对象键或上游原始响应。 */
function publicView(order: any) {
  const now = new Date();
  const downloadable =
    order.status === 'succeeded' &&
    Boolean(order.videoUrl) &&
    isWithinDownloadWindow(order.completedAt, now);

  return {
    orderNo: order.orderNo,
    status: order.status,
    sandbox: order.source === 'stripe_sandbox',
    aspectRatio: order.aspectRatio,
    priceCents: order.priceCents,
    currency: order.currency,
    hasEmail: Boolean(order.notifyEmail),
    createdAt: order.createdAt,
    completedAt: order.completedAt ?? null,
    downloadExpireAt: order.downloadExpireAt ?? null,
    canDownload: downloadable,
    videoUrl: downloadable ? order.videoUrl : null,
    needsAttention: order.status === 'failed_needs_attention',
  };
}

function isDue(order: any, now: Date): boolean {
  const next = order.nextAttemptAt ? new Date(order.nextAttemptAt) : null;
  const lease = order.leaseUntil ? new Date(order.leaseUntil) : null;
  const nextOk = !next || next.getTime() <= now.getTime();
  const leaseOk = !lease || lease.getTime() < now.getTime();
  return nextOk && leaseOk;
}

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { orderId: string };
}) {
  try {
    const token = request.headers.get('x-order-token');
    const runtime = await getZombieRuntime();

    let order = await runtime.orderService.verifyAccess(params.orderId, token);
    if (!order) return respErr('订单不存在或链接无效');

    // 顺带推进一次（走租约 CAS，重复轮询不会重复提交）；
    // 这使 V1 无需 cron 也能跑通，cron 仍作为兜底。
    const now = new Date();
    if (
      runtime.worker &&
      WORKABLE.includes(order.status) &&
      isDue(order, now)
    ) {
      const claimed = await runtime.worker.claim(
        order.id,
        `poll_${Math.random().toString(36).slice(2)}`
      );
      if (claimed) {
        await runtime.worker.step(claimed);
        order = (await runtime.orderService.getOrderById(order.id)) ?? order;
      }
    }

    return respData(publicView(order), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('[zombie] order query failed', error);
    return respErr(error?.message || '查询订单失败');
  }
}

export const Route = createFileRoute('/api/zombie/orders/$orderId')({
  server: { handlers: { GET } },
});
