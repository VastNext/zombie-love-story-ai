/**
 * 保留期策略与清理 worker。
 *
 * 策略（只约束我们自己的存储，不约束 SeeAPI 上游）：
 * - 成功交付后 24 小时删除两张原始肖像。
 * - 技术失败待处理最多保留 7 天，超期删除并标记人工处理。
 * - 未结账草稿保留 DRAFT_TTL_MS 后清理。
 *
 * 注意：14 天是**本站订单入口**的开放期限，不代表 SeeAPI 文件被删除。
 */

import { and, inArray, isNotNull, isNull, or } from 'drizzle-orm';

import { db as defaultDb } from '@/core/db';
import { zombieOrder } from '@/config/db/schema';

import type { OrderService } from './order-service';
import type { ZombieStorage } from './storage';
import {
  PHOTO_RETENTION_AFTER_SUCCESS_MS,
  PHOTO_RETENTION_FAILED_MS,
  systemClock,
  type Clock,
} from './types';

/** 未结账草稿的存活时长。 */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type RetentionDecision =
  | { action: 'keep'; reason: string }
  | { action: 'delete'; reason: string; manualFollowUp: boolean }
  | { action: 'expire_draft'; reason: string };

/** 纯策略：给定订单与当前时间，返回该订单的原始肖像应如何处理。 */
export function photoRetentionDecision(
  order: any,
  now: Date
): RetentionDecision {
  if (!order) return { action: 'keep', reason: 'no_order' };
  if (order.photosDeletedAt)
    return { action: 'keep', reason: 'already_deleted' };
  if (!order.photo1Key && !order.photo2Key) {
    return { action: 'keep', reason: 'no_photos' };
  }

  if (order.status === 'draft') {
    const createdAt = toDate(order.createdAt);
    if (createdAt && now.getTime() - createdAt.getTime() >= DRAFT_TTL_MS) {
      return { action: 'expire_draft', reason: 'draft_expired' };
    }
    return { action: 'keep', reason: 'draft_within_ttl' };
  }

  if (order.status === 'succeeded') {
    const completedAt = toDate(order.completedAt);
    if (
      completedAt &&
      now.getTime() - completedAt.getTime() >= PHOTO_RETENTION_AFTER_SUCCESS_MS
    ) {
      return {
        action: 'delete',
        reason: 'delivered_24h',
        manualFollowUp: false,
      };
    }
    return { action: 'keep', reason: 'within_post_delivery_window' };
  }

  if (order.status === 'failed_needs_attention') {
    // 以最近一次更新作为进入失败态的时间近似值
    const since = toDate(order.updatedAt) ?? toDate(order.createdAt);
    if (since && now.getTime() - since.getTime() >= PHOTO_RETENTION_FAILED_MS) {
      return { action: 'delete', reason: 'failed_7d', manualFollowUp: true };
    }
    return { action: 'keep', reason: 'failed_within_retry_window' };
  }

  // paid/queued/submitted/processing 仍在安全重试期，绝不提前删图
  return { action: 'keep', reason: 'in_progress' };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface RetentionDeps {
  db?: any;
  orderService: OrderService;
  storage: ZombieStorage | null;
  clock?: Clock;
}

const CANDIDATE_STATUSES = [
  'draft',
  'succeeded',
  'failed_needs_attention',
  'canceled',
  'expired',
  'refunded',
];

export function createRetention(deps: RetentionDeps) {
  const database = () => deps.db ?? defaultDb();
  const clock = deps.clock ?? systemClock;

  async function deletePhotos(order: any): Promise<void> {
    if (!deps.storage) return;
    for (const key of [order.photo1Key, order.photo2Key]) {
      if (key) {
        try {
          await deps.storage.deleteObject(key);
        } catch (error) {
          console.error('[zombie-retention] delete failed', key, error);
        }
      }
    }
  }

  /** 跑一轮清理；返回处理的订单数。 */
  async function tick(limit = 20): Promise<number> {
    const rows = await database()
      .select()
      .from(zombieOrder)
      .where(
        and(
          inArray(zombieOrder.status, CANDIDATE_STATUSES),
          isNull(zombieOrder.photosDeletedAt),
          or(isNotNull(zombieOrder.photo1Key), isNotNull(zombieOrder.photo2Key))
        )
      )
      .limit(limit);

    const now = clock();
    let count = 0;

    for (const order of rows) {
      const decision = photoRetentionDecision(order, now);
      if (decision.action === 'keep') continue;

      await deletePhotos(order);

      if (decision.action === 'expire_draft') {
        await deps.orderService.updateStatus(
          order.id,
          'expired',
          { errorCode: 'draft_expired', photosDeletedAt: now },
          { force: true }
        );
      } else {
        await deps.orderService.updateStatus(
          order.id,
          order.status,
          {
            photosDeletedAt: now,
            errorCode: decision.manualFollowUp
              ? 'photos_purged_needs_followup'
              : order.errorCode,
          },
          { force: true }
        );
      }
      count++;
    }

    return count;
  }

  return { tick, deletePhotos };
}

export type Retention = ReturnType<typeof createRetention>;
