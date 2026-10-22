import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { isCronAuthorized } from '@/modules/zombie/cron';
import { getZombieRuntime } from '@/modules/zombie/runtime';
import { respData } from '@/lib/resp';

/** 机器对机器端点：必须用真实 HTTP 状态码，不能沿用 respErr 的 200 约定。 */
function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * 定时任务入口：推进生成、发送通知、清理过期肖像。
 *
 * 供 Vercel Cron 或外部调度调用，必须携带 Bearer 密钥。
 */
function isAuthorized(request: Request): boolean {
  return isCronAuthorized(request, envConfigs.zombie_cron_secret);
}

async function GET({ request }: { request: Request }) {
  if (!isAuthorized(request)) return fail('Forbidden', 403);

  try {
    const runtime = await getZombieRuntime();
    const result = {
      worker: 0,
      notifier: 0,
      retention: 0,
      workerReady: Boolean(runtime.worker),
    };

    if (runtime.worker) {
      result.worker = await runtime.worker.tick(5);
    }
    if (runtime.notifier) {
      result.notifier = await runtime.notifier.tick(10);
    }
    if (runtime.retention) {
      result.retention = await runtime.retention.tick(20);
    }

    return respData(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('[zombie] jobs failed', error);
    return fail(error?.message || '任务执行失败', 500);
  }
}

export const Route = createFileRoute('/api/internal/zombie-jobs')({
  server: { handlers: { GET } },
});
