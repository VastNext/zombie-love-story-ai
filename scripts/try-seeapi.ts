/**
 * 本地直连 SeeAPI 的样片测试脚本（跑通链路 + 看效果 + 比成本）。
 *
 * 用法：
 *   pnpm try:seeapi -- --photo1=./a.jpg --photo2=./b.jpg --model=grok-imagine-video
 *
 * 常用参数：
 *   --model=<id>        video-spec 注册表里的模型（默认 wan-3-0）
 *   --duration=<秒>      默认取该模型规格（25）
 *   --resolution=<p>    480p | 720p | 1080p（默认规格值）
 *   --aspect=9:16|16:9  默认 9:16
 *   --prompt="..."      覆盖默认分镜提示词
 *   --yes               跳过费用确认
 *   --keep              保留 R2 上的临时图片（默认跑完删除）
 *   --timeout=<分钟>     轮询上限，默认 20
 *
 * 说明：脚本复用仓库自身的 R2Provider / SeeAPI 客户端 / video-spec，
 * 因此「跑通」同时验证了这层代码，而不只是验证 API 能调通。
 * 全程不打印任何密钥。
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

import { R2Provider } from '../src/core/storage/r2';
import { createSeeApiClient } from '../src/modules/zombie/seeapi';
import {
  buildGenerationRequest,
  listVideoModels,
  pickVideoAsset,
  resolveVideoSpecFor,
} from '../src/modules/zombie/video-spec';

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const body = raw.slice(2);
    const eq = body.indexOf('=');
    if (eq === -1) out[body] = true;
    else out[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return out;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const args = parseArgs(process.argv.slice(2));
const model = (args.model as string) || 'wan-3-0';
const photo1 = args.photo1 as string;
const photo2 = args.photo2 as string;

if (args.help || args.h) {
  console.log(
    [
      '用法: pnpm try:seeapi -- --photo1=./a.jpg --photo2=./b.jpg [选项]',
      '',
      `可用模型: ${listVideoModels().join(', ')}`,
      '选项: --model --duration --resolution --aspect --prompt --yes --keep --timeout',
    ].join('\n')
  );
  process.exit(0);
}

if (!photo1 || !photo2) fail('必须提供 --photo1 与 --photo2（本地图片路径）');

const spec = resolveVideoSpecFor(model);
if (!spec) {
  fail(`未知模型 "${model}"。可用：${listVideoModels().join(', ')}`);
}

const duration = Number(args.duration ?? spec.durationSeconds ?? 25);
const resolution = (args.resolution as string) || spec.resolution || '720p';
const aspect = (args.aspect as string) || '9:16';
const prompt = args.prompt as string | undefined;
const timeoutMin = Number(args.timeout ?? 20);
const autoYes = Boolean(args.yes);
const keep = Boolean(args.keep);

if (aspect !== '9:16' && aspect !== '16:9')
  fail('--aspect 只能是 9:16 或 16:9');

const apiKey = process.env.SEE_API_KEY;
if (!apiKey) fail('缺少 SEE_API_KEY（应来自 .env.local，经 with-env 注入）');

for (const [label, p] of [
  ['photo1', photo1],
  ['photo2', photo2],
] as const) {
  if (!existsSync(p)) fail(`找不到 ${label}: ${p}`);
  const ext = extname(p).toLowerCase();
  if (!MIME[ext]) fail(`${label} 不支持的格式 ${ext}（仅 jpg/png/webp）`);
}

const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY || '',
  secretAccessKey: process.env.R2_SECRET_KEY || '',
  bucket: process.env.R2_BUCKET_NAME || '',
  region: 'auto',
  uploadPath: '',
};
if (
  !r2Config.accountId ||
  !r2Config.accessKeyId ||
  !r2Config.secretAccessKey ||
  !r2Config.bucket
) {
  fail('缺少 R2_ACCOUNT_ID / R2_ACCESS_KEY / R2_SECRET_KEY / R2_BUCKET_NAME');
}

const seeapi = createSeeApiClient({
  apiKey,
  baseUrl: process.env.SEE_API_BASE_URL || undefined,
});

/** 从 /v1/prices 取该模型该分辨率下的单价（credits/秒）。 */
async function fetchPerSecond(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.seeapi.com/v1/prices?model=${encodeURIComponent(spec!.model)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const json: any = await res.json();
    const entry = (json?.data ?? []).find(
      (x: any) => x.endpoint === spec!.endpoint
    );
    const rule = entry?.pricing?.rule;
    if (!rule) return null;
    if (rule.type === 'linear') {
      if (typeof rule.per === 'number') return rule.per;
      return rule.per?.[resolution] ?? null;
    }
    if (rule.type === 'lookup' && rule.table) {
      const keys = Object.keys(rule.table).filter((k) =>
        String(k).startsWith(`${resolution}|`)
      );
      if (!keys.length) return null;
      const best = keys
        .map((k) => ({ d: Number(String(k).split('|')[1]), v: rule.table[k] }))
        .sort((a, b) => b.d - a.d)[0];
      return +(best.v / best.d).toFixed(2);
    }
    return null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const runId = `local-${Date.now()}`;
  const storage = new R2Provider({ ...r2Config, uploadPath: '' } as any);

  const uploads: string[] = [];
  try {
    console.log(
      `\n模型 ${spec!.model} · 端点 ${spec!.endpoint} · ${duration}s · ${resolution} · ${aspect}`
    );
    console.log(`图片模式: ${spec!.imageMode}`);

    // 1) 上传两张肖像到 R2
    const keys: string[] = [];
    for (const [i, p] of [photo1, photo2].entries()) {
      const ext = extname(p).toLowerCase();
      const key = `zombie/try/${runId}/photo${i + 1}${ext}`;
      const up = await storage.uploadFile({
        body: new Uint8Array(readFileSync(p)),
        key,
        contentType: MIME[ext],
      });
      if (!up.success) fail(`上传 photo${i + 1} 失败: ${up.error}`);
      keys.push(key);
      uploads.push(key);
    }
    console.log(`已上传 2 张到 R2: ${keys.join(', ')}`);

    // 2) 生成 SeeAPI 能匿名拉取的签名 URL（有效期 6 小时，覆盖生成耗时）
    const urls: string[] = [];
    for (const key of keys) {
      urls.push(await storage.getPresignedGetUrl({ key, expiresIn: 6 * 3600 }));
    }

    // 3) 估算费用
    const per = await fetchPerSecond();
    if (per != null) {
      console.log(
        `\n预估费用: ${per}/秒 × ${duration}s = ${Math.round(per * duration)} credits`
      );
    } else {
      console.log(
        '\n预估费用: 无法从 /v1/prices 解出（价格规则含条件），将直接提交'
      );
    }

    if (!autoYes) {
      console.log(
        '\n按 Enter 继续提交真实生成（会消耗 credits），Ctrl+C 取消…'
      );
      await new Promise<void>((res) => {
        process.stdin.once('data', () => res());
        process.stdin.resume();
      });
    }

    const request = buildGenerationRequest(spec!, {
      photoUrls: [urls[0], urls[1]],
      aspectRatio: aspect as any,
      prompt,
      durationSeconds: duration,
      resolution,
    });

    const idem = `local-${randomUUID()}`;
    console.log('\n提交任务…');
    let submitted = await seeapi.createGeneration({
      ...request,
      idempotencyKey: idem,
    });

    // R2 凭据/图片有传播延迟，遇到 4xx 也重试几次
    for (let attempt = 1; !submitted.ok && attempt <= 5; attempt++) {
      console.log(
        `  提交失败(${(submitted as any).kind})，第 ${attempt} 次重试…`
      );
      await sleep(attempt * 3000);
      submitted = await seeapi.createGeneration({
        ...request,
        idempotencyKey: idem,
      });
    }

    if (!submitted.ok) {
      fail(
        `提交失败: ${submitted.kind} ${submitted.status ?? ''} ${submitted.message}`
      );
    }
    console.log(
      `已受理: taskId=${submitted.taskId} status=${submitted.status}`
    );

    // 4) 轮询
    const deadline = Date.now() + timeoutMin * 60_000;
    let last = '';
    let videoUrl: string | null = null;

    while (Date.now() < deadline) {
      await sleep(10_000);
      const poll = await seeapi.getGeneration(submitted.taskId);
      if (!poll.ok) {
        console.log(`  查询异常(${poll.kind})，继续等待…`);
        continue;
      }
      if (poll.status !== last) {
        console.log(`  状态: ${poll.status}`);
        last = poll.status;
      }
      if (poll.status === 'succeeded') {
        const asset = pickVideoAsset(poll.assets);
        if (!asset) fail('任务成功但没有 video 资产');
        videoUrl = asset.url;
        break;
      }
      if (['failed', 'canceled', 'refunded', 'expired'].includes(poll.status)) {
        fail(`上游终态: ${poll.status}`);
      }
    }

    if (!videoUrl)
      fail(
        `超时（${timeoutMin} 分钟）仍未完成，可用 taskId 继续手动查询: ${submitted.taskId}`
      );

    // 5) 下载到本地便于查看
    const outDir = resolve('_local-tests');
    mkdirSync(outDir, { recursive: true });
    const outFile = resolve(
      outDir,
      `${spec!.model}-${duration}s-${resolution}-${Date.now()}.mp4`
    );
    const bin = await fetch(videoUrl);
    if (!bin.ok) fail(`下载成片失败: HTTP ${bin.status}`);
    writeFileSync(outFile, Buffer.from(await bin.arrayBuffer()));

    console.log('\n✓ 生成完成');
    console.log(`  本地文件: ${outFile}`);
    console.log(`  上游链接: ${videoUrl}`);
    console.log(`  taskId  : ${submitted.taskId}`);
  } finally {
    if (!keep && uploads.length) {
      for (const key of uploads) {
        await storage.deleteFile({ key }).catch(() => {});
      }
      console.log('已清理 R2 临时图片（--keep 可保留）');
    }
  }
}

main().catch((e) => fail(e?.message ?? String(e)));
