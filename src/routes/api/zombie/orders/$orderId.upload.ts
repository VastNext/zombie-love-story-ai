import { createFileRoute } from '@tanstack/react-router';

import { DRAFT_TTL_MS } from '@/modules/zombie/retention';
import { getZombieRuntime } from '@/modules/zombie/runtime';
import { validateUpload } from '@/modules/zombie/upload';
import { photoObjectKey } from '@/modules/zombie/upload-request';
import { respData, respErr } from '@/lib/resp';

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { orderId: string };
}) {
  try {
    const body = await request.json().catch(() => ({}));
    const runtime = await getZombieRuntime();
    if (runtime.mode !== 'live') return respErr('当前不开放原图上传');
    const order = await runtime.orderService.verifyAccess(
      params.orderId,
      body.accessToken
    );
    if (!order || order.source !== 'stripe' || order.status !== 'draft')
      return respErr('订单无效');
    // 预签名有效期为五分钟；提前停止签发，保证草稿清理后不能重新写入。
    if (
      Date.now() - new Date(order.createdAt).getTime() >=
      DRAFT_TTL_MS - 600_000
    )
      return respErr('草稿即将过期，请重新创建订单');
    if (body.slot !== 1 && body.slot !== 2) return respErr('照片编号无效');
    const photo = body.photo;
    if (
      !photo ||
      typeof photo !== 'object' ||
      typeof photo.name !== 'string' ||
      typeof photo.type !== 'string' ||
      typeof photo.size !== 'number' ||
      !Number.isFinite(photo.size)
    )
      return respErr('照片信息无效');
    const check = validateUpload([photo, photo]);
    if (!check.ok) return respErr(check.message);
    if (!runtime.storage?.getUploadUrl) return respErr('未配置 R2 原图直传');
    const uploadUrl = await runtime.storage.getUploadUrl(
      photoObjectKey(order.id, body.slot),
      photo.type,
      photo.size
    );
    return respData({ uploadUrl });
  } catch (error) {
    console.error('[zombie] upload URL failed', error);
    return respErr('生成上传链接失败');
  }
}

export const Route = createFileRoute('/api/zombie/orders/$orderId/upload')({
  server: { handlers: { POST } },
});
