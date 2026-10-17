export const AUTH_SECRET_PLACEHOLDER =
  'shipany-dev-secret-change-in-production';

// Isomorphic env access:
// - Public (client-visible) vars are VITE_-prefixed and read from
//   import.meta.env (statically injected into the client bundle by Vite).
// - Server-only vars (secrets) are read from process.env and resolve to ''
//   in the browser — they never reach the client bundle.
const metaEnv: Record<string, string | undefined> =
  (import.meta as any).env ?? {};
const procEnv: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

const publicEnv = (key: string) => metaEnv[key] ?? procEnv[key];

export const envConfigs: Record<string, string> = {
  // App (public)
  app_url: publicEnv('VITE_APP_URL') ?? 'http://localhost:3000',
  app_name: publicEnv('VITE_APP_NAME') ?? 'Video Agent',
  app_description:
    publicEnv('VITE_APP_DESCRIPTION') ??
    'Create and refine AI video clips through conversation.',
  app_logo: publicEnv('VITE_APP_LOGO') ?? '/logo.png',

  // Database
  database_url: procEnv.DATABASE_URL ?? '',
  database_auth_token: procEnv.DATABASE_AUTH_TOKEN ?? '',
  database_provider: procEnv.DATABASE_PROVIDER ?? 'sqlite',
  db_schema: procEnv.DB_SCHEMA ?? 'public',
  db_singleton_enabled: procEnv.DB_SINGLETON_ENABLED ?? 'false',
  db_max_connections: procEnv.DB_MAX_CONNECTIONS ?? '1',

  // Auth
  auth_url: procEnv.AUTH_URL ?? publicEnv('VITE_APP_URL') ?? '',
  auth_secret: procEnv.AUTH_SECRET ?? '',

  // Payment - Stripe
  stripe_secret_key: procEnv.STRIPE_SECRET_KEY ?? '',
  stripe_publishable_key: procEnv.STRIPE_PUBLISHABLE_KEY ?? '',
  stripe_signing_secret: procEnv.STRIPE_SIGNING_SECRET ?? '',

  // Payment - PayPal
  paypal_client_id: procEnv.PAYPAL_CLIENT_ID ?? '',
  paypal_client_secret: procEnv.PAYPAL_CLIENT_SECRET ?? '',
  paypal_webhook_id: procEnv.PAYPAL_WEBHOOK_ID ?? '',
  paypal_environment: procEnv.PAYPAL_ENVIRONMENT ?? 'production',

  // Payment - Alipay
  alipay_app_id: procEnv.ALIPAY_APP_ID ?? '',
  alipay_private_key: procEnv.ALIPAY_PRIVATE_KEY ?? '',
  alipay_public_key: procEnv.ALIPAY_PUBLIC_KEY ?? '',
  alipay_notify_url: procEnv.ALIPAY_NOTIFY_URL ?? '',

  // Payment - WeChat Pay
  wechat_app_id: procEnv.WECHAT_APP_ID ?? '',
  wechat_mch_id: procEnv.WECHAT_MCH_ID ?? '',
  wechat_api_v3_key: procEnv.WECHAT_API_V3_KEY ?? '',
  wechat_private_key: procEnv.WECHAT_PRIVATE_KEY ?? '',
  wechat_serial_no: procEnv.WECHAT_SERIAL_NO ?? '',
  wechat_notify_url: procEnv.WECHAT_NOTIFY_URL ?? '',
  wechat_platform_cert: procEnv.WECHAT_PLATFORM_CERT ?? '',

  // Email - Resend
  resend_api_key: procEnv.RESEND_API_KEY ?? '',
  resend_sender_email:
    procEnv.RESEND_SENDER_EMAIL ?? procEnv.RESEND_EMAIL_FROM ?? '',

  // Storage - S3/R2
  storage_endpoint: procEnv.STORAGE_ENDPOINT ?? '',
  storage_region: procEnv.STORAGE_REGION ?? 'auto',
  storage_access_key: procEnv.STORAGE_ACCESS_KEY ?? '',
  storage_secret_key: procEnv.STORAGE_SECRET_KEY ?? '',
  storage_bucket: procEnv.STORAGE_BUCKET ?? '',
  storage_public_domain: procEnv.STORAGE_PUBLIC_DOMAIN ?? '',
  inline_image_max_kb: procEnv.INLINE_IMAGE_MAX_KB ?? '2048',

  // Storage - R2 (the `r2_*` keys the storage service actually reads).
  // Env fallback so a deployment can be configured without the admin panel;
  // DB values still win (getAllConfigs merges env first, then DB).
  r2_account_id: procEnv.R2_ACCOUNT_ID ?? '',
  r2_access_key: procEnv.R2_ACCESS_KEY ?? '',
  r2_secret_key: procEnv.R2_SECRET_KEY ?? '',
  r2_bucket_name: procEnv.R2_BUCKET_NAME ?? '',
  r2_endpoint: procEnv.R2_ENDPOINT ?? '',
  r2_domain: procEnv.R2_DOMAIN ?? '',
  r2_upload_path: procEnv.R2_UPLOAD_PATH ?? '',

  // Auth - Google / Social
  google_auth_enabled: procEnv.GOOGLE_AUTH_ENABLED ?? 'false',
  google_client_id: procEnv.GOOGLE_CLIENT_ID ?? '',
  google_client_secret: procEnv.GOOGLE_CLIENT_SECRET ?? '',
  google_one_tap_enabled: procEnv.GOOGLE_ONE_TAP_ENABLED ?? 'false',

  // AI
  // OpenAI / Anthropic are admin-panel-only (like Gemini/Fal). No env fallback:
  // OPENAI_API_KEY / ANTHROPIC_API_KEY are common ambient vars, and falling back
  // to them would let the admin "Test" silently pass on the machine's own key.
  replicate_api_token: procEnv.REPLICATE_API_TOKEN ?? '',

  // The agent is configured entirely from Admin Settings: the chat model
  // under AI → Chat Model, the image model from the composer's catalog, and
  // the credit price with it. Nothing about it belongs in env.

  // Zombie Love Story — SeeAPI 生成（服务端专用，浏览器解析为 ''）
  see_api_key: procEnv.SEE_API_KEY ?? '',
  see_api_base_url: procEnv.SEE_API_BASE_URL ?? '',

  // Zombie Love Story — 上线模式与管理员测试门槛
  // admin_test：普通访客不可购买；仅管理员可用 Code 触发真实生成
  // live：正式收款（Stripe）
  zombie_mvp_mode: procEnv.ZOMBIE_MVP_MODE ?? 'admin_test',
  zombie_admin_test_code: procEnv.ZOMBIE_ADMIN_TEST_CODE ?? 'FountainChan',
  zombie_admin_test_user_limit: procEnv.ZOMBIE_ADMIN_TEST_USER_LIMIT ?? '3',
  zombie_admin_test_global_limit:
    procEnv.ZOMBIE_ADMIN_TEST_GLOBAL_LIMIT ?? '10',
  zombie_generation_paused: procEnv.ZOMBIE_GENERATION_PAUSED ?? 'false',
  // cron/内部任务端点的一次性校验密钥（Vercel Cron 会带 x-vercel-cron 头）
  zombie_cron_secret: procEnv.ZOMBIE_CRON_SECRET ?? '',

  // Zombie Love Story — 视频模型规格（验证后可改，不必动路由）
  zombie_video_model: procEnv.ZOMBIE_VIDEO_MODEL ?? '',
  zombie_video_provider: procEnv.ZOMBIE_VIDEO_PROVIDER ?? '',
  zombie_video_duration_seconds: procEnv.ZOMBIE_VIDEO_DURATION_SECONDS ?? '',
  zombie_video_resolution: procEnv.ZOMBIE_VIDEO_RESOLUTION ?? '',

  // Zombie Love Story — 落地页示例视频（公开；留空则显示占位而非坏播放器）
  zombie_sample_video_url: publicEnv('VITE_ZOMBIE_SAMPLE_VIDEO_URL') ?? '',

  // Locale (public)
  locale: publicEnv('VITE_DEFAULT_LOCALE') ?? 'en',
};
