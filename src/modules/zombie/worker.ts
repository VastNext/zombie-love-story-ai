/**
 * Zombie 生成 worker：认领到期订单 → 提交 SeeAPI → 轮询 → 落库成片。
 *
 * 设计要点：
 * - 通过数据库「租约 CAS」防止 Vercel 重叠调度重复提交同一订单。
 * - 幂等键在订单上固化：重试沿用同一个 key，避免重复扣费。
 * - 上游创建请求结果不明（超时）时按 unavailable 退避，nextAttempt 保留；
 *   绝不因本地等待超时而新建任务。
 */

import { and, eq, inArray, isNull, lt, lte, ne, or } from 'drizzle-orm';

import { db as defaultDb } from '@/core/db';
import { zombieOrder } from '@/config/db/schema';

import type { OrderService } from './order-service';
import type { SeeApiClient, SeeApiFailure } from './seeapi';
import { systemClock, type Clock, type ZombieOrderStatus } from './types';
import {
  buildGenerationRequest,
  DEFAULT_VIDEO_SPEC,
  pickVideoAsset,
  type VideoModelSpec,
} from './video-spec';

const WORKABLE_STATUSES: ZombieOrderStatus[] = [
  'paid',
  'queued',
  'submitted',
  'processing',
];

export interface WorkerDeps {
  db?: any;
  orderService: OrderService;
  seeapi: SeeApiClient;
  /** 把私有对象键解析为 SeeAPI 可拉取的 URL */
  resolvePhotoUrl: (key: string) => Promise<string>;
  clock?: Clock;
  spec?: VideoModelSpec;
  leaseMs?: number;
  /** 提交前的生成开关（暂停时只轮询、不新提交） */
  generationPaused?: boolean;
  callbackUrl?: string;
}

/** 指数退避（含抖动），上限 30 分钟。 */
export function backoffMs(attempt: number): number {
  const base = Math.min(
    30 * 60_000,
    15_000 * Math.pow(2, Math.max(0, attempt - 1))
  );
  const jitter = Math.floor(base * 0.2 * Math.random());
  return base + jitter;
}

function isRetryable(failure: SeeApiFailure): boolean {
  return failure.kind === 'rate_limited' || failure.kind === 'unavailable';
}

export function createWorker(deps: WorkerDeps) {
  const database = () => deps.db ?? defaultDb();
  const clock = deps.clock ?? systemClock;
  const spec = deps.spec ?? DEFAULT_VIDEO_SPEC;
  const leaseMs = deps.leaseMs ?? 2 * 60_000;

  /** 原子认领一个订单；返回 null 表示已被其他实例抢走。 */
  async function claim(orderId: string, owner: string): Promise<any | null> {
    const now = clock();
    const rows = await database()
      .update(zombieOrder)
      .set({ leaseOwner: owner, leaseUntil: new Date(now.getTime() + leaseMs) })
      .where(
        and(
          eq(zombieOrder.id, orderId),
          ne(zombieOrder.source, 'stripe_sandbox'),
          or(isNull(zombieOrder.leaseUntil), lt(zombieOrder.leaseUntil, now))
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async function findDueIds(limit: number): Promise<string[]> {
    const now = clock();
    const rows = await database()
      .select({ id: zombieOrder.id })
      .from(zombieOrder)
      .where(
        and(
          inArray(zombieOrder.status, WORKABLE_STATUSES),
          // 沙盒付款不授权真实生成，即使之后切回 live 也不能捞起。
          ne(zombieOrder.source, 'stripe_sandbox'),
          or(
            isNull(zombieOrder.nextAttemptAt),
            lte(zombieOrder.nextAttemptAt, now)
          ),
          or(isNull(zombieOrder.leaseUntil), lt(zombieOrder.leaseUntil, now))
        )
      )
      .limit(limit);
    return rows.map((r: any) => r.id);
  }

  function scheduleRetry(attempt: number) {
    const now = clock();
    return {
      attempts: attempt,
      nextAttemptAt: new Date(now.getTime() + backoffMs(attempt)),
      leaseOwner: null,
      leaseUntil: null,
    };
  }

  /** 处理单个订单一步。 */
  async function step(order: any): Promise<void> {
    if (order.source === 'stripe_sandbox') return;
    const svc = deps.orderService;

    // paid → queued（授权生成）
    let current = order;
    if (current.status === 'paid') {
      const authorized = await svc.updateStatus(current.id, 'queued', {
        idempotencyKey:
          current.idempotencyKey ?? `zls-${current.id}-${current.id}`,
        nextAttemptAt: clock(),
      });
      if (!authorized) return;
      current = authorized;
    }

    if (current.status === 'queued') {
      if (deps.generationPaused) {
        // 暂停：只释放租约，等恢复
        await svc.updateStatus(
          current.id,
          'queued',
          { ...scheduleRetry(current.attempts ?? 0) },
          { force: true }
        );
        return;
      }

      const photo1 = current.photo1Key
        ? await deps.resolvePhotoUrl(current.photo1Key)
        : null;
      const photo2 = current.photo2Key
        ? await deps.resolvePhotoUrl(current.photo2Key)
        : null;
      if (!photo1 || !photo2) {
        await svc.updateStatus(
          current.id,
          'failed_needs_attention',
          { errorCode: 'missing_photos', leaseOwner: null, leaseUntil: null },
          { force: true }
        );
        return;
      }

      const request = buildGenerationRequest(spec, {
        photoUrls: [photo1, photo2],
        aspectRatio: current.aspectRatio,
      });

      const result = await deps.seeapi.createGeneration({
        ...request,
        idempotencyKey: current.idempotencyKey,
        callbackUrl: deps.callbackUrl,
      });

      if (result.ok) {
        await svc.updateStatus(
          current.id,
          'submitted',
          {
            taskId: result.taskId,
            seeapiModel: spec.model,
            seeapiProvider: spec.provider ?? null,
            submittedAt: clock(),
            attempts: (current.attempts ?? 0) + 1,
            nextAttemptAt: new Date(clock().getTime() + 10_000),
            leaseOwner: null,
            leaseUntil: null,
            errorCode: null,
          },
          { force: true }
        );
        return;
      }

      if (isRetryable(result)) {
        await svc.updateStatus(
          current.id,
          'queued',
          {
            ...scheduleRetry((current.attempts ?? 0) + 1),
            errorCode: result.kind,
          },
          { force: true }
        );
        return;
      }

      await svc.updateStatus(
        current.id,
        'failed_needs_attention',
        {
          errorCode: result.kind,
          leaseOwner: null,
          leaseUntil: null,
          nextAttemptAt: null,
        },
        { force: true }
      );
      return;
    }

    if (current.status === 'submitted' || current.status === 'processing') {
      if (!current.taskId) {
        await svc.updateStatus(
          current.id,
          'failed_needs_attention',
          { errorCode: 'missing_task_id', leaseOwner: null, leaseUntil: null },
          { force: true }
        );
        return;
      }

      const result = await deps.seeapi.getGeneration(current.taskId);

      if (!result.ok) {
        if (isRetryable(result)) {
          await svc.updateStatus(
            current.id,
            current.status,
            {
              ...scheduleRetry((current.attempts ?? 0) + 1),
              errorCode: result.kind,
            },
            { force: true }
          );
        } else {
          await svc.updateStatus(
            current.id,
            'failed_needs_attention',
            {
              errorCode: result.kind,
              leaseOwner: null,
              leaseUntil: null,
              nextAttemptAt: null,
            },
            { force: true }
          );
        }
        return;
      }

      const status = result.status;
      if (status === 'processing') {
        await svc.updateStatus(
          current.id,
          'processing',
          {
            nextAttemptAt: new Date(clock().getTime() + 15_000),
            leaseOwner: null,
            leaseUntil: null,
          },
          { force: true }
        );
        return;
      }

      if (status === 'succeeded') {
        const asset = pickVideoAsset(result.assets);
        if (!asset) {
          await svc.updateStatus(
            current.id,
            'failed_needs_attention',
            {
              errorCode: 'no_video_asset',
              leaseOwner: null,
              leaseUntil: null,
              nextAttemptAt: null,
            },
            { force: true }
          );
          return;
        }
        await svc.markSucceeded(current.id, asset);
        return;
      }

      // failed | canceled | refunded | expired
      await svc.updateStatus(
        current.id,
        'failed_needs_attention',
        {
          errorCode: `upstream_${status}`,
          leaseOwner: null,
          leaseUntil: null,
          nextAttemptAt: null,
        },
        { force: true }
      );
    }
  }

  /** 跑一轮：认领并处理至多 limit 个到期订单。返回处理数。 */
  async function tick(
    limit = 5,
    owner = `w_${Math.random().toString(36).slice(2)}`
  ): Promise<number> {
    const ids = await findDueIds(limit);
    let processed = 0;
    for (const id of ids) {
      const claimed = await claim(id, owner);
      if (!claimed) continue;
      try {
        await step(claimed);
      } catch (error) {
        // 单条失败不影响其余订单
        console.error('[zombie-worker] step failed', id, error);
        await deps.orderService.updateStatus(
          id,
          claimed.status,
          {
            ...scheduleRetry((claimed.attempts ?? 0) + 1),
            errorCode: 'worker_error',
          },
          { force: true }
        );
      }
      processed++;
    }
    return processed;
  }

  return { tick, step, claim, findDueIds };
}

export type Worker = ReturnType<typeof createWorker>;
