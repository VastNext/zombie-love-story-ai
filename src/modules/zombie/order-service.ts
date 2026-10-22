/**
 * Zombie 订单服务：创建、访问鉴权、状态迁移、付款登记、配额计数。
 *
 * 所有数据库访问都通过注入的 `db`，时钟通过注入的 `clock`，
 * 以便集成测试使用内存库与固定时间。
 */

import { and, eq, inArray, sql } from 'drizzle-orm';

import { db as defaultDb } from '@/core/db';
import { zombieOrder } from '@/config/db/schema';
import { decryptSecret, encryptSecret } from '@/lib/crypto';

import {
  generateAccessToken,
  generateIdempotencyKey,
  generateOrderId,
  generateOrderNo,
  hashAccessToken,
  timingSafeEqual,
} from './tokens';
import {
  canTransition,
  downloadExpireAt,
  systemClock,
  type Clock,
  type ZombieAspectRatio,
  type ZombieOrderStatus,
  type ZombieSource,
} from './types';

export interface ZombieOrderDeps {
  db?: any;
  clock?: Clock;
}

/** 已占用生成额度的状态（用于管理员测试计数）。 */
const QUOTA_STATUSES: ZombieOrderStatus[] = [
  'queued',
  'submitted',
  'processing',
  'succeeded',
  'failed_needs_attention',
];

export interface CreateDraftInput {
  aspectRatio: ZombieAspectRatio;
  source: ZombieSource;
  notifyEmail?: string | null;
  priceCents: number;
  currency?: string;
  createdByUserId?: string | null;
  testCode?: string | null;
}

export interface CreatedOrder {
  order: any;
  accessToken: string;
}

export function createOrderService(deps: ZombieOrderDeps = {}) {
  const database = () => deps.db ?? defaultDb();
  const clock = deps.clock ?? systemClock;

  /** 创建草稿订单并返回一次性访问令牌（调用方负责展示/保存，服务端只存哈希）。 */
  async function createDraft(input: CreateDraftInput): Promise<CreatedOrder> {
    const accessToken = generateAccessToken();
    const accessTokenHash = await hashAccessToken(accessToken);
    const id = generateOrderId();
    const orderNo = generateOrderNo();
    // 仅当用户留下邮箱时才保留可解密副本，用于事后发送领取链接。
    const deliveryTokenEnc = input.notifyEmail
      ? await encryptSecret(accessToken)
      : null;

    const rows = await database()
      .insert(zombieOrder)
      .values({
        id,
        orderNo,
        accessTokenHash,
        deliveryTokenEnc,
        source: input.source,
        createdByUserId: input.createdByUserId ?? null,
        status: 'draft',
        aspectRatio: input.aspectRatio,
        notifyEmail: input.notifyEmail ?? null,
        priceCents: input.priceCents,
        currency: input.currency ?? 'usd',
        requestVersion: 'v1',
        testCode: input.testCode ?? null,
      })
      .returning();

    return { order: rows[0], accessToken };
  }

  async function getOrderById(orderId: string): Promise<any | null> {
    if (!orderId) return null;
    const rows = await database()
      .select()
      .from(zombieOrder)
      .where(eq(zombieOrder.id, orderId))
      .limit(1);
    return rows[0] ?? null;
  }

  async function getByStripeSession(sessionId: string): Promise<any | null> {
    if (!sessionId) return null;
    const rows = await database()
      .select()
      .from(zombieOrder)
      .where(eq(zombieOrder.stripeSessionId, sessionId))
      .limit(1);
    return rows[0] ?? null;
  }

  /** 解密领取令牌，用于发送邮件链接；无邮箱或无副本时返回 null。 */
  async function getDeliveryToken(order: any): Promise<string | null> {
    if (!order?.deliveryTokenEnc) return null;
    return decryptSecret(order.deliveryTokenEnc);
  }

  /** 校验访问令牌是否与订单匹配。 */
  async function verifyAccess(
    orderId: string,
    accessToken: string | null | undefined
  ): Promise<any | null> {
    if (!accessToken) return null;
    const order = await getOrderById(orderId);
    if (!order) return null;
    const candidate = await hashAccessToken(accessToken);
    return timingSafeEqual(candidate, order.accessTokenHash) ? order : null;
  }

  async function attachPhotos(
    orderId: string,
    photos: { photo1Key: string; photo2Key: string }
  ): Promise<any | null> {
    const rows = await database()
      .update(zombieOrder)
      .set({
        photo1Key: photos.photo1Key,
        photo2Key: photos.photo2Key,
        updatedAt: clock(),
      })
      .where(eq(zombieOrder.id, orderId))
      .returning();
    return rows[0] ?? null;
  }

  /**
   * 状态迁移。默认拒绝非法迁移（返回 null），除非 `force`。
   */
  async function updateStatus(
    orderId: string,
    to: ZombieOrderStatus,
    patch: Record<string, any> = {},
    options: { force?: boolean } = {}
  ): Promise<any | null> {
    const current = await getOrderById(orderId);
    if (!current) return null;
    if (!options.force && !canTransition(current.status, to)) {
      return null;
    }
    const rows = await database()
      .update(zombieOrder)
      .set({ ...patch, status: to, updatedAt: clock() })
      .where(
        and(eq(zombieOrder.id, orderId), eq(zombieOrder.status, current.status))
      )
      .returning();
    return rows[0] ?? null;
  }

  async function markCheckoutPending(
    orderId: string,
    stripeSessionId: string
  ): Promise<any | null> {
    const rows = await database()
      .update(zombieOrder)
      .set({ status: 'checkout_pending', stripeSessionId, updatedAt: clock() })
      .where(and(eq(zombieOrder.id, orderId), eq(zombieOrder.status, 'draft')))
      .returning();
    if (rows[0]) return rows[0];
    const current = await getOrderById(orderId);
    return current?.stripeSessionId === stripeSessionId ? current : null;
  }

  async function expireDraft(orderId: string): Promise<any | null> {
    const rows = await database()
      .update(zombieOrder)
      .set({
        status: 'expired',
        errorCode: 'draft_expired',
        updatedAt: clock(),
      })
      .where(and(eq(zombieOrder.id, orderId), eq(zombieOrder.status, 'draft')))
      .returning();
    return rows[0] ?? null;
  }

  /**
   * 依据 Stripe Session 标记已付款。幂等：已 paid 的订单不重复迁移，
   * 但仍返回订单，便于 webhook 重复投递时安全返回 2xx。
   */
  async function markPaidBySession(
    sessionId: string,
    info: {
      paymentIntentId?: string | null;
      email?: string | null;
      paidAt?: Date | null;
    } = {}
  ): Promise<{ order: any | null; alreadyPaid: boolean }> {
    const existing = await getByStripeSession(sessionId);
    if (!existing) return { order: null, alreadyPaid: false };
    if (existing.status !== 'checkout_pending' && existing.status !== 'draft') {
      // 已是 paid 或更后状态：重复事件，直接返回
      return { order: existing, alreadyPaid: true };
    }
    const rows = await database()
      .update(zombieOrder)
      .set({
        status: 'paid',
        stripePaymentIntentId: info.paymentIntentId ?? null,
        notifyEmail: info.email ?? existing.notifyEmail ?? null,
        paidAt: info.paidAt ?? clock(),
        updatedAt: clock(),
      })
      .where(
        and(
          eq(zombieOrder.id, existing.id),
          inArray(zombieOrder.status, ['draft', 'checkout_pending'])
        )
      )
      .returning();
    return {
      order: rows[0] ?? (await getOrderById(existing.id)),
      alreadyPaid: !rows[0],
    };
  }

  /**
   * 授权生成：draft（admin_test）/ paid → queued，并固化幂等键。
   */
  async function authorizeGeneration(orderId: string): Promise<any | null> {
    const current = await getOrderById(orderId);
    if (!current) return null;
    if (!canTransition(current.status, 'queued')) return null;

    const idempotencyKey =
      current.idempotencyKey ?? generateIdempotencyKey(orderId);
    return updateStatus(orderId, 'queued', {
      idempotencyKey,
      nextAttemptAt: clock(),
      errorCode: null,
    });
  }

  /** 记录成片完成并计算下载截止时间。 */
  async function markSucceeded(
    orderId: string,
    video: {
      url: string;
      assetId?: string | null;
      expiresAt?: Date | null;
    }
  ): Promise<any | null> {
    const now = clock();
    const current = await getOrderById(orderId);
    const hasEmail = Boolean(current?.notifyEmail);
    return updateStatus(
      orderId,
      'succeeded',
      {
        videoUrl: video.url,
        videoAssetId: video.assetId ?? null,
        videoExpiresAt: video.expiresAt ?? null,
        completedAt: now,
        downloadExpireAt: downloadExpireAt(now),
        leaseOwner: null,
        leaseUntil: null,
        nextAttemptAt: null,
        // 有邮箱才排队通知；无邮箱标记为 skipped，绝不假装已通知
        notifyStatus: hasEmail ? 'pending' : 'skipped',
        notifyNextAt: hasEmail ? now : null,
      },
      { force: true }
    );
  }

  /** 统计某管理员已占用的测试生成额度。 */
  async function countSubmissionsForUser(userId: string): Promise<number> {
    const rows = await database()
      .select({ value: sql<number>`count(*)` })
      .from(zombieOrder)
      .where(
        and(
          eq(zombieOrder.source, 'admin_test'),
          eq(zombieOrder.createdByUserId, userId),
          inArray(zombieOrder.status, QUOTA_STATUSES)
        )
      );
    return Number(rows[0]?.value ?? 0);
  }

  /** 统计全环境已占用的测试生成额度。 */
  async function countSubmissionsGlobal(): Promise<number> {
    const rows = await database()
      .select({ value: sql<number>`count(*)` })
      .from(zombieOrder)
      .where(
        and(
          eq(zombieOrder.source, 'admin_test'),
          inArray(zombieOrder.status, QUOTA_STATUSES)
        )
      );
    return Number(rows[0]?.value ?? 0);
  }

  return {
    createDraft,
    getOrderById,
    getByStripeSession,
    getDeliveryToken,
    verifyAccess,
    attachPhotos,
    updateStatus,
    markCheckoutPending,
    expireDraft,
    markPaidBySession,
    authorizeGeneration,
    markSucceeded,
    countSubmissionsForUser,
    countSubmissionsGlobal,
  };
}

export type OrderService = ReturnType<typeof createOrderService>;

let singleton: OrderService | null = null;

/** 生产用单例（真实 db + 系统时钟）。 */
export function getOrderService(): OrderService {
  if (!singleton) singleton = createOrderService();
  return singleton;
}
