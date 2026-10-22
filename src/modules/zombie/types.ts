/**
 * Zombie Love Story 订单领域类型与纯逻辑。
 *
 * 这个模块刻意不依赖数据库、网络或框架，方便单测直接覆盖状态机与边界计算。
 */

/** 订单来源。`admin_test` 永远是零金额，绝不进入 `paid`。 */
export type ZombieSource = 'admin_test' | 'stripe' | 'stripe_sandbox';

/** 交付画幅。一笔订单只交付所选画幅的一条视频。 */
export type ZombieAspectRatio = '9:16' | '16:9';

export const ZOMBIE_ASPECT_RATIOS: ZombieAspectRatio[] = ['9:16', '16:9'];

export function isAspectRatio(value: unknown): value is ZombieAspectRatio {
  return value === '9:16' || value === '16:9';
}

/**
 * 订单生成状态机。
 *
 * draft            草稿（已上传图片，未付款）
 * checkout_pending 已创建 Stripe 收银台，等待 webhook 确认
 * paid             已确认付款，等待提交生成
 * queued           已授权生成（admin_test 直接到此，不经 paid）
 * submitted        已向 SeeAPI 提交并拿到 task id
 * processing       上游任务处理中
 * succeeded        成片可领取
 * failed_needs_attention 需人工处理（额度/上游终态失败）
 * refunded / canceled / expired 终态
 */
export const ZOMBIE_ORDER_STATUSES = [
  'draft',
  'checkout_pending',
  'paid',
  'queued',
  'submitted',
  'processing',
  'succeeded',
  'failed_needs_attention',
  'refunded',
  'canceled',
  'expired',
] as const;

export type ZombieOrderStatus = (typeof ZOMBIE_ORDER_STATUSES)[number];

/** 终态：不再自动推进。 */
export const TERMINAL_STATUSES: ZombieOrderStatus[] = [
  'succeeded',
  'failed_needs_attention',
  'refunded',
  'canceled',
  'expired',
];

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as string[]).includes(status);
}

/** 允许的状态迁移；未列出的迁移一律拒绝。 */
const TRANSITIONS: Record<ZombieOrderStatus, ZombieOrderStatus[]> = {
  draft: ['checkout_pending', 'queued', 'canceled', 'expired'],
  checkout_pending: ['paid', 'canceled', 'expired'],
  paid: ['queued', 'failed_needs_attention', 'refunded'],
  queued: ['submitted', 'failed_needs_attention', 'refunded'],
  submitted: ['processing', 'succeeded', 'failed_needs_attention'],
  processing: ['succeeded', 'failed_needs_attention'],
  succeeded: [],
  failed_needs_attention: ['queued', 'refunded', 'succeeded'],
  refunded: [],
  canceled: [],
  expired: [],
};

export function canTransition(
  from: ZombieOrderStatus,
  to: ZombieOrderStatus
): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** 邮件通知状态，与生成状态解耦。 */
export type ZombieNotifyStatus =
  | 'none'
  | 'pending'
  | 'sent'
  | 'retry_due'
  | 'skipped';

/** 可注入的时钟，便于复现 14 天 / 24 小时 / 7 天边界。 */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 成片可下载窗口：从 completedAt 起 14 天。 */
export const DOWNLOAD_WINDOW_DAYS = 14;

/** 成功交付后原始肖像保留时长：24 小时。 */
export const PHOTO_RETENTION_AFTER_SUCCESS_MS = MS_PER_DAY;

/** 技术失败待处理的原始肖像最长保留：7 天。 */
export const PHOTO_RETENTION_FAILED_MS = 7 * MS_PER_DAY;

/** 单条视频固定售价（美分）。 */
export const ZOMBIE_PRICE_CENTS = 499;
export const ZOMBIE_CURRENCY = 'usd';
export const ZOMBIE_PRODUCT_ID = 'zombie_single';

/**
 * 判断订单是否仍在可下载窗口内。
 * 只依据 completedAt + 窗口，付款时间不参与（未完成不提前过期）。
 */
export function isWithinDownloadWindow(
  completedAt: Date | null | undefined,
  now: Date
): boolean {
  if (!completedAt) return false;
  const expireAt = new Date(
    completedAt.getTime() + DOWNLOAD_WINDOW_DAYS * MS_PER_DAY
  );
  return now.getTime() < expireAt.getTime();
}

/** 下载窗口截止时刻；未完成返回 null。 */
export function downloadExpireAt(
  completedAt: Date | null | undefined
): Date | null {
  if (!completedAt) return null;
  return new Date(completedAt.getTime() + DOWNLOAD_WINDOW_DAYS * MS_PER_DAY);
}
