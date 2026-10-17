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
import {
  DEFAULT_VIDEO_SPEC,
  resolveVideoSpecFor,
  type VideoModelSpec,
} from './video-spec';
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

/**
 * 环境变量覆盖默认视频规格（验证后改环境变量即可，不必改代码）。
 *
 * ZOMBIE_VIDEO_MODEL 必须是 video-spec 注册表里的 id；未知值会回退默认并告警，
 * 避免把「模型名写错」变成线上静默走错模型。
 */
export function resolveVideoSpec(): VideoModelSpec {
  const requested = envConfigs.zombie_video_model;
  let spec: VideoModelSpec = DEFAULT_VIDEO_SPEC;

  if (requested) {
    const found = resolveVideoSpecFor(requested);
    if (found) {
      spec = found;
    } else {
      console.warn(
        `[zombie] ZOMBIE_VIDEO_MODEL=${requested} 不在注册表中，回退默认 ${DEFAULT_VIDEO_SPEC.model}`
      );
    }
  }

  const resolved: VideoModelSpec = { ...spec };
  if (envConfigs.zombie_video_provider) {
    resolved.provider = envConfigs.zombie_video_provider;
  }
  const duration = Number(envConfigs.zombie_video_duration_seconds);
  if (Number.isFinite(duration) && duration > 0) {
    resolved.durationSeconds = duration;
  }
  if (envConfigs.zombie_video_resolution) {
    resolved.resolution = envConfigs.zombie_video_resolution;
  }
  return resolved;
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
