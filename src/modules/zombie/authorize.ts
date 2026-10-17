/**
 * 上线模式与管理员测试授权（纯函数，便于单测）。
 *
 * 关键约束：`FountainChan` 只是流程开关，**不是授权凭证**。
 * 是否放行完全由「管理员身份 + 模式 + 暂停开关 + 配额」决定。
 */

export type ZombieMode = 'admin_test' | 'live';

export function parseMode(value: unknown): ZombieMode {
  return value === 'live' ? 'live' : 'admin_test';
}

export function parsePaused(value: unknown): boolean {
  return value === 'true' || value === true;
}

export function parsePositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export type AdminTestDenyReason =
  | 'not_admin'
  | 'wrong_mode'
  | 'paused'
  | 'missing_code'
  | 'bad_code'
  | 'user_quota_exceeded'
  | 'global_quota_exceeded';

export type AdminTestDecision =
  | { allowed: true }
  | { allowed: false; reason: AdminTestDenyReason; message: string };

export interface AdminTestAuthInput {
  isAdmin: boolean;
  mode: ZombieMode;
  paused: boolean;
  /** 用户提交的 Code */
  code: string | null | undefined;
  /** 服务端配置的 Code */
  expectedCode: string;
  userSubmissions: number;
  userLimit: number;
  globalSubmissions: number;
  globalLimit: number;
}

export function authorizeAdminTest(
  input: AdminTestAuthInput
): AdminTestDecision {
  if (!input.isAdmin) {
    return {
      allowed: false,
      reason: 'not_admin',
      message: '只有管理员账号可以使用测试生成',
    };
  }
  if (input.mode !== 'admin_test') {
    return {
      allowed: false,
      reason: 'wrong_mode',
      message: '当前已切换为正式收款模式，测试入口已关闭',
    };
  }
  if (input.paused) {
    return {
      allowed: false,
      reason: 'paused',
      message: '生成已被暂停',
    };
  }
  if (!input.code) {
    return {
      allowed: false,
      reason: 'missing_code',
      message: '请填写测试 Code',
    };
  }
  if (input.code !== input.expectedCode) {
    return { allowed: false, reason: 'bad_code', message: '测试 Code 不正确' };
  }
  if (input.userSubmissions >= input.userLimit) {
    return {
      allowed: false,
      reason: 'user_quota_exceeded',
      message: `已达到个人测试上限（${input.userLimit} 次）`,
    };
  }
  if (input.globalSubmissions >= input.globalLimit) {
    return {
      allowed: false,
      reason: 'global_quota_exceeded',
      message: `已达到全环境测试上限（${input.globalLimit} 次）`,
    };
  }
  return { allowed: true };
}
