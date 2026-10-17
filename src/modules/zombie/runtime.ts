/**
 * Zombie 运行时的依赖装配。
 *
 * 把「配置读环境 / 存储 / SeeAPI / 订单服务 / worker / 通知 / 清理」
 * 集中到一处，路由只调用这里，便于替换与测试。
 */

import { envConfigs } from '@/config';

import {
  parseMode,
  parsePaused,
  parsePositiveInt,
  type ZombieMode,
} from './authorize';
import { buildCompletionEmail } from './emails';
import { getDefaultMailer } from './mailer';
import { createNotifier } from './notification';
import { createOrderService, getOrderService } from './order-service';
import { createRetention } from './retention';
import { getSeeApiClient, type SeeApiClient } from './seeapi';
import { getZombieStorage, type ZombieStorage } from './storage';
import { DEFAULT_VIDEO_SPEC, type VideoModelSpec } from './video-spec';
import { createWorker } from './worker';

export interface ZombieRuntime {
  mode: ZombieMode;
  paused: boolean;
  adminTestCode: string;
  userLimit: number;
  globalLimit: number;
  spec: VideoModelSpec;
  orderService: ReturnType<typeof createOrderService>;
  storage: ZombieStorage | null;
  seeapi: SeeApiClient | null;
  worker: ReturnType<typeof createWorker> | null;
  notifier: ReturnType<typeof createNotifier> | null;
  retention: ReturnType<typeof createRetention> | null;
}

/** 环境变量覆盖默认视频规格（验证后改环境变量即可，不必改代码）。 */
export function resolveVideoSpec(): VideoModelSpec {
  const spec: VideoModelSpec = { ...DEFAULT_VIDEO_SPEC };
  if (envConfigs.zombie_video_model) spec.model = envConfigs.zombie_video_model;
  if (envConfigs.zombie_video_provider) {
    spec.provider = envConfigs.zombie_video_provider;
  }
  const duration = Number(envConfigs.zombie_video_duration_seconds);
  if (Number.isFinite(duration) && duration > 0) {
    spec.durationSeconds = duration;
  }
  return spec;
}

/** 轻量模式信息：不做存储/SeeAPI 初始化，供模式查询接口使用。 */
export function getZombieModeInfo() {
  return {
    mode: parseMode(envConfigs.zombie_mvp_mode),
    paused: parsePaused(envConfigs.zombie_generation_paused),
  };
}

export async function getZombieRuntime(): Promise<ZombieRuntime> {
  const mode = parseMode(envConfigs.zombie_mvp_mode);
  const paused = parsePaused(envConfigs.zombie_generation_paused);
  const adminTestCode = envConfigs.zombie_admin_test_code || 'FountainChan';
  const userLimit = parsePositiveInt(
    envConfigs.zombie_admin_test_user_limit,
    3
  );
  const globalLimit = parsePositiveInt(
    envConfigs.zombie_admin_test_global_limit,
    10
  );
  const spec = resolveVideoSpec();

  const orderService = getOrderService();
  const storage = await getZombieStorage();
  const seeapi = getSeeApiClient();

  let worker: ZombieRuntime['worker'] = null;
  if (storage && seeapi) {
    worker = createWorker({
      orderService,
      seeapi,
      spec,
      generationPaused: paused,
      resolvePhotoUrl: (key) => storage.getReadUrl(key, 3600),
    });
  }

  const mailer = await getDefaultMailer();
  const notifier = createNotifier({
    orderService,
    mailer,
    appUrl: envConfigs.app_url || 'http://localhost:3000',
    buildEmail: buildCompletionEmail,
  });

  const retention = createRetention({ orderService, storage });

  return {
    mode,
    paused,
    adminTestCode,
    userLimit,
    globalLimit,
    spec,
    orderService,
    storage,
    seeapi,
    worker,
    notifier,
    retention,
  };
}
