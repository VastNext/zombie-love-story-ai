/**
 * SeeAPI HTTP 客户端。
 *
 * 只做「构造请求 → 分类结果」，不含业务状态机。fetch 可注入，
 * 便于用 msw/替身做集成测试而不联网。
 */

import { envConfigs } from '@/config';

export const SEEAPI_DEFAULT_BASE_URL = 'https://api.seeapi.com';

export type SeeApiFailureKind =
  | 'rejected' // 400 等：请求本身无效，不要原样重试
  | 'auth' // 401/403
  | 'insufficient_credits' // 402
  | 'rate_limited' // 429
  | 'unavailable' // 503 / 网络错误 / 超时
  | 'unknown';

export interface SeeApiFailure {
  ok: false;
  kind: SeeApiFailureKind;
  status?: number;
  retryAfterMs?: number;
  message: string;
  raw?: unknown;
}

export interface SeeApiCreateSuccess {
  ok: true;
  taskId: string;
  status: string;
  raw: any;
}

export interface SeeApiTaskSuccess {
  ok: true;
  /** processing | succeeded | failed | canceled | refunded | expired */
  status: string;
  assets: unknown[];
  raw: any;
}

export interface CreateGenerationParams {
  model: string;
  endpoint: string;
  provider?: string;
  input: Record<string, unknown>;
  idempotencyKey: string;
  callbackUrl?: string;
}

export interface SeeApiClientDeps {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

function parseRetryAfterMs(res: Response): number | undefined {
  const header = res.headers.get('retry-after');
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = new Date(header);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }
  return undefined;
}

function classifyStatus(status: number): SeeApiFailureKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 402) return 'insufficient_credits';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'unavailable';
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return 'rejected';
  }
  if (status >= 500) return 'unavailable';
  return 'unknown';
}

export function createSeeApiClient(deps: SeeApiClientDeps) {
  const baseUrl = (deps.baseUrl ?? SEEAPI_DEFAULT_BASE_URL).replace(/\/+$/, '');
  const doFetch = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 60_000;

  type FetchOutcome = { ok: true; response: Response } | SeeApiFailure;

  async function request(
    path: string,
    init: RequestInit
  ): Promise<FetchOutcome> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await doFetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
      return { ok: true, response };
    } catch (error: any) {
      return {
        ok: false,
        kind: 'unavailable',
        message: `network error: ${error?.message ?? String(error)}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function createGeneration(
    params: CreateGenerationParams
  ): Promise<SeeApiCreateSuccess | SeeApiFailure> {
    const body: Record<string, unknown> = {
      model: params.model,
      endpoint: params.endpoint,
      input: params.input,
    };
    if (params.provider) body.provider = params.provider;
    if (params.callbackUrl) body.callback_url = params.callbackUrl;

    const res = await request('/v1/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': params.idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return res;

    const response = res.response;
    let json: any = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        kind: classifyStatus(response.status),
        status: response.status,
        retryAfterMs: parseRetryAfterMs(response),
        message:
          json?.error?.message ?? json?.message ?? `HTTP ${response.status}`,
        raw: json,
      };
    }

    const generation = json?.generation ?? json;
    const taskId = generation?.id ?? generation?.task_id ?? generation?.taskId;
    if (!taskId) {
      return {
        ok: false,
        kind: 'unknown',
        status: response.status,
        message: 'response missing generation id',
        raw: json,
      };
    }

    return {
      ok: true,
      taskId: String(taskId),
      status: String(generation?.status ?? 'processing'),
      raw: json,
    };
  }

  async function getGeneration(
    taskId: string
  ): Promise<SeeApiTaskSuccess | SeeApiFailure> {
    const res = await request(`/v1/generations/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${deps.apiKey}` },
    });

    if (!res.ok) return res;

    const response = res.response;
    let json: any = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        kind: classifyStatus(response.status),
        status: response.status,
        retryAfterMs: parseRetryAfterMs(response),
        message:
          json?.error?.message ?? json?.message ?? `HTTP ${response.status}`,
        raw: json,
      };
    }

    const generation = json?.generation ?? json;
    const assets = generation?.result?.assets ?? generation?.assets ?? [];

    return {
      ok: true,
      status: String(generation?.status ?? 'processing'),
      assets: Array.isArray(assets) ? assets : [],
      raw: json,
    };
  }

  return { createGeneration, getGeneration };
}

export type SeeApiClient = ReturnType<typeof createSeeApiClient>;

/** 生产用客户端；缺少 API key 时抛错（由调用方判断是否已配置）。 */
export function getSeeApiClient(): SeeApiClient | null {
  const apiKey = envConfigs.see_api_key;
  if (!apiKey) return null;
  return createSeeApiClient({
    apiKey,
    baseUrl: envConfigs.see_api_base_url || SEEAPI_DEFAULT_BASE_URL,
  });
}
