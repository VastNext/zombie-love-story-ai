import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { beforeEach, describe, expect, it } from 'vitest';

import { createOrderService } from './order-service';

/**
 * 集成测试：内存 libsql + 真实 drizzle，验证订单服务的关键不变量。
 * 使用与生产一致的列定义（由 schema.sqlite.ts 手工镜像，列名需保持同步）。
 */
const DDL = `
CREATE TABLE zombie_order (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  access_token_hash TEXT NOT NULL,
  delivery_token_enc TEXT,
  source TEXT NOT NULL,
  created_by_user_id TEXT,
  status TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  photo1_key TEXT,
  photo2_key TEXT,
  notify_email TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  request_version TEXT NOT NULL DEFAULT 'v1',
  seeapi_model TEXT,
  seeapi_provider TEXT,
  idempotency_key TEXT UNIQUE,
  task_id TEXT,
  video_url TEXT,
  video_asset_id TEXT,
  video_expires_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  next_attempt_at INTEGER,
  lease_owner TEXT,
  lease_until INTEGER,
  notify_status TEXT NOT NULL DEFAULT 'none',
  notify_attempts INTEGER NOT NULL DEFAULT 0,
  notify_next_at INTEGER,
  test_code TEXT,
  paid_at INTEGER,
  submitted_at INTEGER,
  completed_at INTEGER,
  download_expire_at INTEGER,
  photos_deleted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER
);
`;

async function makeDb() {
  const client = createClient({ url: 'file::memory:' });
  await client.executeMultiple(DDL);
  return drizzle({ client });
}

describe('order service (integration, in-memory libsql)', () => {
  let db: any;
  let seq = 0;
  // 固定时钟，保证时间断言可复现
  let nowValue = new Date('2026-07-01T00:00:00Z');
  const clock = () => nowValue;

  beforeEach(async () => {
    db = await makeDb();
    seq = 0;
    nowValue = new Date('2026-07-01T00:00:00Z');
  });

  function svc() {
    return createOrderService({ db, clock });
  }

  it('重复关联同一结账会话幂等，付款后不能退回待付款', async () => {
    const service = svc();
    const { order } = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });
    expect(await service.markCheckoutPending(order.id, 'cs_same')).toBeTruthy();
    expect(await service.markCheckoutPending(order.id, 'cs_same')).toBeTruthy();
    expect(await service.markCheckoutPending(order.id, 'cs_other')).toBeNull();
    await service.markPaidBySession('cs_same');
    await service.markCheckoutPending(order.id, 'cs_same');
    expect((await service.getOrderById(order.id)).status).toBe('paid');
  });

  it('清理不能认领已经进入支付流程的草稿', async () => {
    const service = svc();
    const { order } = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });
    await service.markCheckoutPending(order.id, 'cs_keep');
    expect(await service.expireDraft(order.id)).toBeNull();
    expect((await service.getOrderById(order.id)).status).toBe(
      'checkout_pending'
    );
  });

  it('creates a draft order with a unique order number and access token', async () => {
    const service = svc();
    const { order, accessToken } = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });
    expect(order.status).toBe('draft');
    expect(order.orderNo).toMatch(/^ZLS-/);
    expect(accessToken).toBeTruthy();
    expect(order.accessTokenHash).not.toContain(accessToken);
  });

  it('does not persist a decryptable token when no email is given', async () => {
    const service = svc();
    const { order } = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });
    expect(order.deliveryTokenEnc).toBeNull();
  });

  it('verifies the access token and rejects wrong or missing tokens', async () => {
    const service = svc();
    const { order, accessToken } = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });

    expect(await service.verifyAccess(order.id, accessToken)).toBeTruthy();
    expect(await service.verifyAccess(order.id, 'wrong')).toBeNull();
    expect(await service.verifyAccess(order.id, null)).toBeNull();
    expect(await service.verifyAccess('zo_missing', accessToken)).toBeNull();
  });

  it('keeps the same order visible across two independent connections', async () => {
    const service = svc();
    const { order, accessToken } = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });
    // 第二个服务实例共享同一个内存库，模拟跨进程/跨请求读取
    const other = createOrderService({ db, clock });
    const found = await other.verifyAccess(order.id, accessToken);
    expect(found?.id).toBe(order.id);
  });

  it('rejects illegal transitions but allows the documented path', async () => {
    const service = svc();
    const { order } = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });

    // draft → succeeded 不是合法迁移
    expect(await service.updateStatus(order.id, 'succeeded')).toBeNull();

    expect(
      await service.markCheckoutPending(order.id, 'cs_test_1')
    ).toBeTruthy();
    const paid = await service.markPaidBySession('cs_test_1', {
      paymentIntentId: 'pi_1',
      paidAt: nowValue,
    });
    expect(paid.order.status).toBe('paid');

    const queued = await service.authorizeGeneration(order.id);
    expect(queued?.status).toBe('queued');
    expect(queued?.idempotencyKey).toBeTruthy();
  });

  it('treats a repeated paid webhook as idempotent', async () => {
    const service = svc();
    const { order } = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });
    await service.markCheckoutPending(order.id, 'cs_test_2');

    const first = await service.markPaidBySession('cs_test_2', {
      paidAt: nowValue,
    });
    const second = await service.markPaidBySession('cs_test_2', {
      paidAt: nowValue,
    });

    expect(first.alreadyPaid).toBe(false);
    expect(second.alreadyPaid).toBe(true);
    expect(second.order.status).toBe('paid');
  });

  it('ignores webhooks for unknown sessions', async () => {
    const service = svc();
    const result = await service.markPaidBySession('cs_unknown', {});
    expect(result.order).toBeNull();
    expect(result.alreadyPaid).toBe(false);
  });

  it('records the video and sets the 14-day download window from completion', async () => {
    const service = svc();
    const { order } = await service.createDraft({
      aspectRatio: '16:9',
      source: 'stripe',
      priceCents: 499,
    });
    await service.markCheckoutPending(order.id, 'cs_test_3');
    await service.markPaidBySession('cs_test_3', { paidAt: nowValue });
    await service.authorizeGeneration(order.id);

    const done = await service.markSucceeded(order.id, {
      url: 'https://cdn/v.mp4',
      assetId: 'a1',
    });

    expect(done.status).toBe('succeeded');
    expect(done.videoUrl).toBe('https://cdn/v.mp4');
    // 有邮箱才排队通知；本例无邮箱 → skipped
    expect(done.notifyStatus).toBe('skipped');
    expect(new Date(done.downloadExpireAt).getTime()).toBe(
      new Date('2026-07-15T00:00:00Z').getTime()
    );
  });

  it('counts only submitted admin_test orders against the quota', async () => {
    const service = svc();

    // 三条不同状态的测试订单
    const a = await service.createDraft({
      aspectRatio: '9:16',
      source: 'admin_test',
      priceCents: 0,
      createdByUserId: 'u1',
    });
    const b = await service.createDraft({
      aspectRatio: '9:16',
      source: 'admin_test',
      priceCents: 0,
      createdByUserId: 'u1',
    });
    const c = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
      createdByUserId: 'u1',
    });

    // 草稿尚未占用额度
    expect(await service.countSubmissionsForUser('u1')).toBe(0);
    expect(await service.countSubmissionsGlobal()).toBe(0);

    await service.authorizeGeneration(a.order.id);
    await service.authorizeGeneration(b.order.id);
    await service.authorizeGeneration(c.order.id);

    // 两条 admin_test + 一条 stripe；只有 admin_test 计入测试配额
    expect(await service.countSubmissionsForUser('u1')).toBe(2);
    expect(await service.countSubmissionsGlobal()).toBe(2);
    expect(await service.countSubmissionsForUser('someone_else')).toBe(0);
  });

  it('returns the stored delivery token only when an email was provided', async () => {
    const service = svc();
    const withEmail = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
      notifyEmail: 'a@b.com',
    });
    const withoutEmail = await service.createDraft({
      aspectRatio: '9:16',
      source: 'stripe',
      priceCents: 499,
    });

    expect(await service.getDeliveryToken(withEmail.order)).toBe(
      withEmail.accessToken
    );
    expect(await service.getDeliveryToken(withoutEmail.order)).toBeNull();
  });
});
