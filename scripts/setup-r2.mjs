/**
 * 用 Cloudflare API 自动创建 R2 桶与 S3 凭据，并写入 .env.local。
 *
 * 用法：
 *   CF_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy node scripts/setup-r2.mjs [bucket]
 *
 * 前置条件（缺一不可）：
 *   1. 账户已在 Cloudflare 控制台「启用/购买」R2（官方明确：未启用无法生成 API token）。
 *   2. CF_API_TOKEN 需要两项权限：
 *        - Account → Workers R2 Storage → Edit   （建桶）
 *        - Account → Account API Tokens → Edit   （创建 S3 凭据所需的下发 token 能力）
 *
 * 安全：Access Key / Secret 只写进 .env.local（已被 .gitignore 忽略）与 stdout 之外的地方，
 *      绝不打印到日志。脚本只回显变量名与长度。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API = 'https://api.cloudflare.com/client/v4';
const token = process.env.CF_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const bucket = process.argv[2] || process.env.R2_BUCKET_NAME || 'zombie-love';

if (!token || !accountId) {
  console.error(
    '缺少 CF_API_TOKEN 或 CLOUDFLARE_ACCOUNT_ID。\n' +
      '  例：CF_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy node scripts/setup-r2.mjs zombie-love'
  );
  process.exit(1);
}

async function cf(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const detail = JSON.stringify(json.errors ?? json).slice(0, 400);
    throw new Error(
      `CF ${init.method || 'GET'} ${path} -> HTTP ${res.status}: ${detail}`
    );
  }
  return json.result;
}

async function ensureBucket() {
  const buckets = await cf(`/accounts/${accountId}/r2/buckets`);
  const found = (buckets?.buckets ?? []).find((b) => b.name === bucket);
  if (found) {
    console.log(`[r2] 桶已存在：${bucket}`);
    return;
  }
  await cf(`/accounts/${accountId}/r2/buckets`, {
    method: 'POST',
    body: JSON.stringify({ name: bucket }),
  });
  console.log(`[r2] 已创建桶：${bucket}`);
}

async function createS3Credential() {
  // 找到 "Workers R2 Storage Write" 权限组的 id（不硬编码，避免变更导致失效）
  const groups = await cf(`/accounts/${accountId}/tokens/permission_groups`);
  const group = (groups ?? []).find(
    (g) => g.name === 'Workers R2 Storage Write'
  );
  if (!group) {
    throw new Error('未找到权限组 "Workers R2 Storage Write"');
  }

  const created = await cf(`/accounts/${accountId}/tokens`, {
    method: 'POST',
    body: JSON.stringify({
      name: `zombie-love-r2-${Date.now()}`,
      policies: [
        {
          effect: 'allow',
          resources: { [`com.cloudflare.api.account.${accountId}`]: '*' },
          permission_groups: [{ id: group.id }],
        },
      ],
    }),
  });

  const accessKey = created?.id;
  const secretKey = created?.value;
  if (!accessKey || !secretKey) {
    throw new Error('创建 token 成功但未返回 id/value，无法作为 S3 凭据');
  }
  return { accessKey, secretKey };
}

function upsertEnvLocal(vars) {
  const file = resolve('.env.local');
  let content = existsSync(file) ? readFileSync(file, 'utf8') : '';
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    content = re.test(content)
      ? content.replace(re, line)
      : content.replace(/\n?$/, `\n${line}\n`);
  }
  writeFileSync(file, content, 'utf8');
  console.log(`[env] 已写入 .env.local：${Object.keys(vars).join(', ')}`);
}

const vars = {
  R2_ACCOUNT_ID: accountId,
  R2_BUCKET_NAME: bucket,
};

await ensureBucket();
const { accessKey, secretKey } = await createS3Credential();
vars.R2_ACCESS_KEY = accessKey;
vars.R2_SECRET_KEY = secretKey;

upsertEnvLocal(vars);

console.log('\n完成。变量名与长度（不显示密钥）：');
for (const [k, v] of Object.entries(vars)) {
  console.log(`  ${k} = <${String(v).length} chars>`);
}
console.log(
  '\n下一步（把同样四项写入 Vercel 生产，值经管道传入不会打印）：\n' +
    '  for k in R2_ACCOUNT_ID R2_BUCKET_NAME R2_ACCESS_KEY R2_SECRET_KEY; do\n' +
    "    v=$(sed -n \"s/^$k=//p\" .env.local | head -1 | tr -d '\"' | tr -d '\\r')\n" +
    '    printf \'%s\' "$v" | vercel env add "$k" production --sensitive\n' +
    '  done'
);
