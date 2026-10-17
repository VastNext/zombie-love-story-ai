# AGENTS.md — Zombie Love Story AI (zombie-love.com)

> 本文件是 AI Agent（OpenCode / Claude Code / Codex 等）在此仓库工作的**首要上下文**。开始任何改动前必须通读本文。

---

## 一、项目概述

- **域名**：[https://zombie-love.com](https://zombie-love.com)（Vercel + Cloudflare）
- **仓库**：[VastNext/zombie-love-story-ai](https://github.com/VastNext/zombie-love-story-ai)
- **业务**：用户上传两张成年人肖像（照片 1 = 幸存者，照片 2 = 感染者），选择 9:16 或 16:9，付 **$4.99 一次性**，得到一条“末日对峙 → 放下武器 → 相拥 → 切入温暖回忆”的电影级 match-cut 视频。
- **一句话**：这是**付费视频交付产品**，不是聊天工具、不是套餐订阅站。

---

## 二、两阶段上线模式（务必理解）

用 `ZOMBIE_MVP_MODE` 控制，服务端权威判定：

| 模式                         | 说明                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `admin_test`（当前默认，V1） | 普通访客只能看落地页/样片，**不能上传/购买**；仅**管理员**登录后在弹窗输入测试 Code 才能触发真实生成 |
| `live`（V2）                 | 移除 Code 分支，游客可选邮箱 → Stripe $4.99 → webhook 确认付款后自动生成                             |

**红线**：`FountainChan` 只是流程开关，**不是授权凭证、不是秘密**。放行必须由「管理员身份 + 模式 + 未暂停 + 未超配额」在服务端共同决定。禁止靠前端隐藏控件来“保护”接口。

配额：每管理员 3 次、全环境 10 次**已提交任务**（`ZOMBIE_ADMIN_TEST_USER_LIMIT` / `ZOMBIE_ADMIN_TEST_GLOBAL_LIMIT`），另有 `ZOMBIE_GENERATION_PAUSED` 紧急停止。

---

## 三、技术栈与架构

- **框架**：TanStack Start（Vite + Nitro SSR、React 19、TypeScript strict）、文件路由 `src/routes/`、shadcn/ui、Tailwind 4。
- **数据库**：Drizzle ORM。`src/config/db/schema.ts` 由 `pnpm db:setup` 从 `schema.{sqlite|postgres|mysql}.ts` 模板生成（**schema.ts 被 gitignore**，改模板后必须跑 `db:setup`）。
- **认证**：better-auth（Google OAuth + 邮箱密码）；RBAC 权限判定用 `hasPermission(userId, 'admin.settings.read')`。
- **支付**：Stripe（Zombie 专用链路，不复用会发放 credits 的通用 order 链路）。
- **存储**：R2（私有对象 + 签名 URL + 删除）。
- **邮件**：Resend（后台配置，未配置时通知保持 pending 重试，**绝不谎报已发送**）。
- **生成**：SeeAPI 异步任务（`POST /v1/generations` → `GET /v1/generations/{task_id}`）。

### Zombie 垂直模块

```
src/modules/zombie/
├── types.ts           # 状态机、画幅、14天/24小时/7天常量、下载窗口（纯函数）
├── tokens.ts          # 订单 ID、访问令牌、哈希、幂等键、恒定时间比较
├── order-service.ts   # 订单 CRUD / 鉴权 / 状态迁移 / 付款登记 / 配额（可注入 db+clock）
├── authorize.ts       # 上线模式与管理员测试授权（纯函数）
├── upload.ts          # 上传校验 + 邮箱归一化（纯函数）
├── video-spec.ts      # 视频模型字段映射 + 提示词 + 资产提取（纯函数）
├── seeapi.ts          # SeeAPI HTTP 客户端（fetch 可注入，HTTP 错误分类）
├── worker.ts          # 租约认领 + 提交 + 轮询 + 退避（可恢复）
├── notification.ts    # 成片完成邮件 worker
├── retention.ts       # 肖像保留期策略与清理（纯策略 + worker）
├── storage.ts         # 私有存储门面（上传/签名读取/删除）
├── mailer.ts          # 邮件门面
├── emails.ts          # 邮件 HTML
└── runtime.ts         # 依赖装配（环境变量 → 服务实例）
```

**路由**：`/api/zombie/mode`、`/api/zombie/orders`(POST 建单+上传)、`/api/zombie/orders/$orderId`(GET 查询，附带推进)、`/api/zombie/admin-test`、`/api/zombie/checkout`、`/api/zombie/webhook/stripe`、`/api/internal/zombie-jobs`(cron)；页面 `/zombie/order`。

### 订单状态机

`draft → checkout_pending → paid → queued → submitted → processing → succeeded | failed_needs_attention`，另有 `refunded | canceled | expired`。`admin_test` 直接 `draft → queued`，**绝不经过 paid**。迁移由 `canTransition` 白名单控制。

### 私有订单访问

访问令牌只存 **sha256 哈希**（邮箱场景另存 AES-GCM 加密副本以便补发邮件链接）。令牌放在 URL **fragment**（`#o=..&t=..`，不随 Referer/服务端日志外泄），客户端读取后经 `x-order-token` 头访问接口。

---

## 四、命令

```bash
pnpm install
pnpm db:setup                 # 改过 schema 模板后必跑（同步 schema.ts）
pnpm test                     # 145 个用例（unit + 集成），必须全绿
pnpm exec tsc --noEmit        # 类型检查
pnpm dev                      # 开发服务器 :3000
HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890 pnpm build
```

`routeTree.gen.ts` 为生成物（gitignore），由 `vite build`/dev 自动重建；新增路由后若 tsc 报 route id 错误，跑一次 build 即可。

---

## 五、测试分层（不要混用）

| 标签            | 运行方式                                                                                  | 进 CI           |
| --------------- | ----------------------------------------------------------------------------------------- | --------------- |
| `[unit]`        | vitest `node`，无网络无 DB（状态机、令牌、校验、授权、保留期）                            | ✅              |
| `[integration]` | 内存 libsql + 注入 db/clock/seeapi 替身                                                   | ✅              |
| `[manual-gate]` | 真实 SeeAPI 样片、真实 Stripe 付款、Resend 真发、生产库重启、上游 14 天可用性、移动端播放 | ❌ 人工登记证据 |

设计约束：路由只做「解析请求 → 调 service → 返回」；业务逻辑必须可注入依赖，**禁止**模块顶层直接 `fetch` 外部域名、直连真实库、把 `new Date()` 当唯一时间源。

---

## 六、重要规则与红线

1. **每次改动立即提交**（颗粒度细，Conventional Commits，中文描述）；不要堆无关改动。
2. **禁止提交密钥**：SeeAPI key、Stripe secret、Auth secret 一律走环境变量/后台配置，不得写入代码或日志。
3. **不得虚报能力**：25 秒 / 720p / 无水印 / 两人身份一致 / 上游 14 天可用，在真实样片验证通过前**不得写进对外承诺**。定价固定 $4.99 一条视频（`src/modules/zombie/types.ts` 的 `ZOMBIE_PRICE_CENTS`）。
4. **14 天是本站下载入口期限**，从成片完成算；**不等于** SeeAPI 文件被删除，也不保证直链失效。不得写“14 天后彻底删除”。
5. **A 方案的已知弱项**：SeeAPI 资产 URL 可匿名访问，私密性与到期删除无法同时严格保证。若要强化，需改用自有对象存储并重新评估成本。

---

## 七、已知限制（脚本/文档不得当作已完成）

- **生产持久化未落实**：`src/core/db/sqlite.ts` 在 Vercel 把库复制到 `/tmp`，实例间不共享、重新部署即丢。上线收款前必须配置**托管持久数据库**（如 Turso）并跑迁移；`init-sql.ts` 不能替代迁移。
- 仓库**无 E2E/浏览器测试**；组件级交互属人工闸门。
- 通用 `order`/credits/聊天/`/pricing` 页面为模板遗留，不属于本产品主链路；Zombie 订单不发放积分。
