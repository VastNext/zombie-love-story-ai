import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { authorizeAdminTest } from '@/modules/zombie/authorize';
import { getZombieRuntime } from '@/modules/zombie/runtime';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

/**
 * V1 管理员测试入口。
 *
 * `FountainChan` 只是流程开关，授权完全由服务端判定：
 * 管理员身份 + admin_test 模式 + 未暂停 + 未超配额 + 订单属于本人。
 */
async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1500,
    keyPrefix: 'zombie-admin-test',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('未登录');

    const isAdmin = await hasPermission(session.user.id, 'admin.settings.read');

    const body = await request.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
    const code = typeof body?.code === 'string' ? body.code : null;

    if (!orderId) return respErr('缺少 orderId');

    const runtime = await getZombieRuntime();

    const [userSubmissions, globalSubmissions] = await Promise.all([
      runtime.orderService.countSubmissionsForUser(session.user.id),
      runtime.orderService.countSubmissionsGlobal(),
    ]);

    const decision = authorizeAdminTest({
      isAdmin,
      mode: runtime.mode,
      paused: runtime.paused,
      code,
      expectedCode: runtime.adminTestCode,
      userSubmissions,
      userLimit: runtime.userLimit,
      globalSubmissions,
      globalLimit: runtime.globalLimit,
    });

    if (!decision.allowed) return respErr(decision.message);

    const order = await runtime.orderService.getOrderById(orderId);
    if (!order) return respErr('订单不存在');
    if (order.source !== 'admin_test') {
      return respErr('该订单不是测试订单');
    }
    if (order.createdByUserId && order.createdByUserId !== session.user.id) {
      return respErr('无权操作该订单');
    }
    if (order.status !== 'draft') {
      return respErr(`订单当前状态为 ${order.status}，无法开始生成`);
    }

    const authorized = await runtime.orderService.authorizeGeneration(order.id);
    if (!authorized) return respErr('订单无法进入生成队列');

    return respData({
      orderId: authorized.id,
      orderNo: authorized.orderNo,
      status: authorized.status,
    });
  } catch (error: any) {
    console.error('[zombie] admin-test failed', error);
    return respErr(error?.message || '启动测试生成失败');
  }
}

export const Route = createFileRoute('/api/zombie/admin-test')({
  server: { handlers: { POST } },
});
