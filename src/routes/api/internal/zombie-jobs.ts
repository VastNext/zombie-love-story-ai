import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getZombieRuntime } from '@/modules/zombie/runtime';
import { respData, respErr } from '@/lib/resp';

/**
 * 定时任务入口：推进生成、发送通知、清理过期肖像。
 *
 * 供 Vercel Cron 或外部调度调用。校验方式二选一：
 * - Vercel Cron 自带的 `x-vercel-cron` 头
 * - `Authorization: Bearer <ZOMBIE_CRON_SECRET>`
 */
function isAuthorized(request: Request): boolean {
  if (request.headers.get('x-vercel-cron')) return true;
  const secret = envConfigs.zombie_cron_secret;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

async function GET({ request }: { request: Request }) {
  if (!isAuthorized(request)) return respErr('Forbidden');

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
    return respErr(error?.message || '任务执行失败');
  }
}

export const Route = createFileRoute('/api/internal/zombie-jobs')({
  server: { handlers: { GET } },
});
