import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { canCreateZombieOrder } from '@/modules/zombie/authorize';
import { getZombieRuntime } from '@/modules/zombie/runtime';
import {
  isAspectRatio,
  ZOMBIE_CURRENCY,
  ZOMBIE_PRICE_CENTS,
} from '@/modules/zombie/types';
import { normalizeEmail, validateUpload } from '@/modules/zombie/upload';
import {
  parseSandboxPhotoInfo,
  photoObjectKey,
} from '@/modules/zombie/upload-request';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 2000,
    keyPrefix: 'zombie-order',
  });
  if (limited) return limited;

  try {
    const runtime = await getZombieRuntime();
    if (runtime.paused) return respErr('生成服务已暂停，暂不接收新订单');
    if (runtime.mode === 'stripe_sandbox' || runtime.mode === 'live') {
      const body = await request.json().catch(() => ({}));
      const aspectRatio = body?.aspectRatio;
      if (!isAspectRatio(aspectRatio))
        return respErr('请选择画幅（9:16 或 16:9）');
      const check = parseSandboxPhotoInfo(body?.photos);
      if (!check.ok) return respErr(check.message);

      const auth = getAuth();
      const session = await auth.api.getSession({ headers: request.headers });
      const isAdmin = session?.user
        ? await hasPermission(session.user.id, 'admin.settings.read')
        : false;
      if (!canCreateZombieOrder(runtime.mode, isAdmin))
        return respErr('即将开放，敬请期待');
      if (runtime.mode === 'live' && !runtime.storage?.getUploadUrl)
        return respErr('未配置 R2 原图直传');
      const { order, accessToken } = await runtime.orderService.createDraft({
        aspectRatio,
        source: runtime.mode === 'stripe_sandbox' ? 'stripe_sandbox' : 'stripe',
        notifyEmail:
          runtime.mode === 'live' ? normalizeEmail(body.email) : null,
        priceCents: ZOMBIE_PRICE_CENTS,
        currency: ZOMBIE_CURRENCY,
        createdByUserId: session?.user?.id ?? null,
      });
      if (runtime.mode === 'live') {
        // 草稿即登记预留的对象键，未付款或仅上传一张也能按保留期清理。
        await runtime.orderService.attachPhotos(order.id, {
          photo1Key: photoObjectKey(order.id, 1),
          photo2Key: photoObjectKey(order.id, 2),
        });
      }
      return respData({
        orderId: order.id,
        orderNo: order.orderNo,
        accessToken,
        status: 'draft',
      });
    }
    const form = await request.formData();

    const aspectRatio = String(form.get('aspectRatio') ?? '');
    if (!isAspectRatio(aspectRatio)) {
      return respErr('请选择画幅（9:16 或 16:9）');
    }

    const photo1 = form.get('photo1');
    const photo2 = form.get('photo2');
    const files = [photo1, photo2].filter(
      (file): file is File => file instanceof File
    );
    const check = validateUpload(
      files.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }))
    );
    if (!check.ok) return respErr(check.message);

    if (!runtime.storage) {
      return respErr('存储未配置，暂时无法接收照片');
    }

    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    const isAdmin = session?.user
      ? await hasPermission(session.user.id, 'admin.settings.read')
      : false;

    // 测试模式只允许管理员上传肖像，避免收集无法交付的私人照片。
    if (!canCreateZombieOrder(runtime.mode, isAdmin)) {
      return respErr('即将开放，敬请期待');
    }

    const source = runtime.mode === 'admin_test' ? 'admin_test' : 'stripe';
    const email = normalizeEmail(form.get('email'));

    const { order, accessToken } = await runtime.orderService.createDraft({
      aspectRatio,
      source,
      notifyEmail: email,
      priceCents: ZOMBIE_PRICE_CENTS,
      currency: ZOMBIE_CURRENCY,
      createdByUserId: session?.user?.id ?? null,
    });

    if (runtime.storage) {
      const key1 = `zombie/orders/${order.id}/photo1`;
      const key2 = `zombie/orders/${order.id}/photo2`;

      await runtime.storage.uploadObject({
        key: key1,
        bytes: new Uint8Array(await files[0].arrayBuffer()),
        contentType: files[0].type,
      });
      await runtime.storage.uploadObject({
        key: key2,
        bytes: new Uint8Array(await files[1].arrayBuffer()),
        contentType: files[1].type,
      });

      await runtime.orderService.attachPhotos(order.id, {
        photo1Key: key1,
        photo2Key: key2,
      });
    }

    return respData({
      orderId: order.id,
      orderNo: order.orderNo,
      accessToken,
      status: 'draft',
      aspectRatio,
      priceCents: ZOMBIE_PRICE_CENTS,
      currency: ZOMBIE_CURRENCY,
    });
  } catch (error: any) {
    console.error('[zombie] create order failed', error);
    return respErr(error?.message || '创建订单失败');
  }
}

export const Route = createFileRoute('/api/zombie/orders/')({
  server: { handlers: { POST } },
});
