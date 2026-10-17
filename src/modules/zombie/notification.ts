/**
 * 成片完成通知 worker。
 *
 * 邮件是**独立交付步骤**：生成成功与通知成功是两个状态，邮件失败绝不重生成视频。
 * 无邮箱的订单在 markSucceeded 时即被标记 skipped，这里不会触碰。
 */

import { and, eq, inArray, isNull, lte, or } from 'drizzle-orm';

import { db as defaultDb } from '@/core/db';
import { zombieOrder } from '@/config/db/schema';

import type { Mailer } from './mailer';
import type { OrderService } from './order-service';
import { systemClock, type Clock } from './types';

const PENDING_STATUSES = ['pending', 'retry_due'];

export interface NotifierDeps {
  db?: any;
  orderService: OrderService;
  mailer: Mailer | null;
  clock?: Clock;
  appUrl: string;
  buildEmail: (args: { order: any; orderUrl: string }) => {
    subject: string;
    html: string;
    text?: string;
  };
  maxAttempts?: number;
}

/** 通知重试退避：1 分钟起、上限 1 小时。 */
export function notifyBackoffMs(attempt: number): number {
  const base = Math.min(
    60 * 60_000,
    60_000 * Math.pow(2, Math.max(0, attempt - 1))
  );
  return base + Math.floor(base * 0.2 * Math.random());
}

export function createNotifier(deps: NotifierDeps) {
  const database = () => deps.db ?? defaultDb();
  const clock = deps.clock ?? systemClock;
  const maxAttempts = deps.maxAttempts ?? 5;

  async function findDue(limit: number): Promise<any[]> {
    const now = clock();
    return database()
      .select()
      .from(zombieOrder)
      .where(
        and(
          eq(zombieOrder.status, 'succeeded'),
          inArray(zombieOrder.notifyStatus, PENDING_STATUSES),
          or(
            isNull(zombieOrder.notifyNextAt),
            lte(zombieOrder.notifyNextAt, now)
          )
        )
      )
      .limit(limit);
  }

  async function sendOne(order: any): Promise<void> {
    const svc = deps.orderService;
    const now = clock();

    if (!order.notifyEmail) {
      await svc.updateStatus(
        order.id,
        'succeeded',
        { notifyStatus: 'skipped', notifyNextAt: null },
        { force: true }
      );
      return;
    }

    if (!deps.mailer) {
      // 未配置邮件：保持 pending，等配置好后重试；不谎报已发送
      await svc.updateStatus(
        order.id,
        'succeeded',
        {
          notifyStatus: 'retry_due',
          notifyNextAt: new Date(now.getTime() + notifyBackoffMs(1)),
        },
        { force: true }
      );
      return;
    }

    const token = await svc.getDeliveryToken(order);
    const orderUrl = token
      ? `${deps.appUrl}/zombie/order#o=${encodeURIComponent(order.id)}&t=${encodeURIComponent(token)}`
      : `${deps.appUrl}/zombie/order#o=${encodeURIComponent(order.id)}`;

    const mail = deps.buildEmail({ order, orderUrl });
    const result = await deps.mailer.send({
      to: order.notifyEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    const attempts = (order.notifyAttempts ?? 0) + 1;

    if (result.ok) {
      await svc.updateStatus(
        order.id,
        'succeeded',
        {
          notifyStatus: 'sent',
          notifyAttempts: attempts,
          notifyNextAt: null,
        },
        { force: true }
      );
      return;
    }

    const exhausted = attempts >= maxAttempts;
    await svc.updateStatus(
      order.id,
      'succeeded',
      {
        notifyStatus: exhausted ? 'skipped' : 'retry_due',
        notifyAttempts: attempts,
        notifyNextAt: exhausted
          ? null
          : new Date(now.getTime() + notifyBackoffMs(attempts)),
      },
      { force: true }
    );
  }

  /** 处理一轮待发通知；返回处理数量。 */
  async function tick(limit = 10): Promise<number> {
    const due = await findDue(limit);
    let count = 0;
    for (const order of due) {
      try {
        await sendOne(order);
      } catch (error) {
        console.error('[zombie-notifier] send failed', order.id, error);
      }
      count++;
    }
    return count;
  }

  return { tick, sendOne, findDue };
}

export type Notifier = ReturnType<typeof createNotifier>;
