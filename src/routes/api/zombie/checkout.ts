import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { envConfigs } from '@/config';
import { hasPermission } from '@/modules/rbac/service';
import { canCheckoutZombieOrder } from '@/modules/zombie/authorize';
import { DRAFT_TTL_MS } from '@/modules/zombie/retention';
import { getZombieRuntime } from '@/modules/zombie/runtime';
import { createZombieCheckoutSession } from '@/modules/zombie/stripe';
import {
  isImageSignature,
  verifyUploadedPhotos,
} from '@/modules/zombie/upload-request';
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

    if (runtime.mode === 'admin_test') {
      return respErr('收款尚未开放');
    }
    if (runtime.paused) return respErr('生成服务已暂停，暂不收款');

    let adminId: string | null = null;
    if (runtime.mode === 'stripe_sandbox') {
      const session = await getAuth().api.getSession({
        headers: request.headers,
      });
      if (
        !session?.user ||
        !(await hasPermission(session.user.id, 'admin.settings.read'))
      ) {
        return respErr('仅管理员可测试沙盒支付');
      }
      adminId = session.user.id;
    }

    const order = await runtime.orderService.verifyAccess(orderId, accessToken);
    if (!order) return respErr('订单不存在或链接无效');
    if (
      !canCheckoutZombieOrder(
        runtime.mode,
        Boolean(adminId),
        order.source,
        order.createdByUserId,
        adminId
      )
    ) {
      return respErr('无权支付该订单');
    }
    if (order.status !== 'draft') {
      return respErr(`订单状态为 ${order.status}，无法再次支付`);
    }
    if (
      Date.now() - new Date(order.createdAt).getTime() >=
      DRAFT_TTL_MS - 600_000
    )
      return respErr('草稿即将过期，请重新创建订单');

    if (runtime.mode === 'live') {
      if (!runtime.storage?.getObjectInfo) return respErr('未配置 R2 原图校验');
      const verified = await verifyUploadedPhotos(order.id, (key) =>
        runtime.storage!.getObjectInfo!(key)
      );
      if (!verified.ok) return respErr(verified.message);
      if (!runtime.storage.getObjectHeader)
        return respErr('未配置 R2 文件校验');
      for (const [index, key] of verified.keys.entries()) {
        const metadata = await runtime.storage.getObjectInfo!(key);
        const header = await runtime.storage.getObjectHeader(key);
        if (!metadata || !isImageSignature(metadata.type, header))
          return respErr(`第 ${index + 1} 张照片格式无效`);
      }
      if (
        order.photo1Key !== verified.keys[0] ||
        order.photo2Key !== verified.keys[1]
      ) {
        return respErr('订单照片关联失败');
      }
    }

    const appUrl = envConfigs.app_url || 'http://localhost:3000';
    const session = await createZombieCheckoutSession({
      orderId: order.id,
      orderNo: order.orderNo,
      aspectRatio: order.aspectRatio,
      priceCents: order.priceCents,
      currency: order.currency,
      email: order.notifyEmail,
      appUrl,
      sandbox: runtime.mode === 'stripe_sandbox',
    });

    const pending = await runtime.orderService.markCheckoutPending(
      order.id,
      session.sessionId
    );
    if (!pending) return respErr('订单状态已变化，请重新创建订单');

    return respData({ checkoutUrl: session.url, sessionId: session.sessionId });
  } catch (error: any) {
    console.error('[zombie] checkout failed', error);
    return respErr(error?.message || '创建支付失败');
  }
}

export const Route = createFileRoute('/api/zombie/checkout')({
  server: { handlers: { POST } },
});
