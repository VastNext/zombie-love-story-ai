import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { getZombieModeInfo } from '@/modules/zombie/runtime';
import { ZOMBIE_CURRENCY, ZOMBIE_PRICE_CENTS } from '@/modules/zombie/types';
import { respData } from '@/lib/resp';

const noStore = {
  headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
};

async function GET({ request }: { request: Request }) {
  const { mode, paused } = getZombieModeInfo();

  let isAdmin = false;
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user) {
      isAdmin = await hasPermission(session.user.id, 'admin.settings.read');
    }
  } catch {
    // 未登录/无会话：按非管理员处理
  }

  return respData(
    {
      mode,
      generationPaused: paused,
      // 只有 V1 模式 + 管理员 + 未暂停时才允许看到测试入口
      canTest: mode === 'admin_test' && isAdmin && !paused,
      canCheckout: mode === 'live' || (mode === 'stripe_sandbox' && isAdmin),
      priceCents: ZOMBIE_PRICE_CENTS,
      currency: ZOMBIE_CURRENCY,
    },
    noStore
  );
}

export const Route = createFileRoute('/api/zombie/mode')({
  server: { handlers: { GET } },
});
