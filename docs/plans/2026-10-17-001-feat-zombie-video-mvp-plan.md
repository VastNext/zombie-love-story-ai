---
title: 两阶段 Zombie Love Story AI 付费视频 MVP 开发说明书
type: feat
status: 待用户确认
date: 2026-10-17
---

# 两阶段 Zombie Love Story AI 付费视频 MVP 开发说明书

> 本文是**开发前的设计与验收依据**，不是已经实现的功能清单。用户确认之前不改业务代码、不部署、不触发 Stripe 或 SeeAPI 真实收费。目标仓库：`zombie-love-story-ai`。路径均相对仓库根目录。

## 1. 目标、版本及边界

让用户上传两张**各包含一名已同意使用肖像的成年人**的照片：照片 1 为幸存者，照片 2 为感染者；付款前选择 9:16 或 16:9；一笔 $4.99 USD 的一次性订单交付**所选画幅的一条**双人僵尸爱情故事视频。内容预期为末日相遇、拥抱、切入温暖回忆，不含血腥画面。候选交付规格为 25 秒、720p、无水印、场景原声；不承诺内置音乐、字幕或免费创意重做。**以上规格及两人辨识度是实际样片验证目标，未验证前不得对外承诺或向公众收款。**

| 版本        | 公网 `zombie-love.com` 普通访客                                                                        | 已登录管理员                                                                                                     | 生成来源                                    |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| V1 受控验证 | 可看落地页、样片、在浏览器本地预览两图；购买按钮显示即将开放；不向服务端上传访客照片、不收邮箱、不结账 | 付款前弹框额外显示 Code；输入 `FountainChan` 后服务端再次校验管理员、开关和次数，创建零金额测试订单并提交 SeeAPI | SeeAPI 真实付费调用，不能伪造 Stripe 已付款 |
| V2 正式收款 | 可作为游客上传、提供**可选**邮箱、选画幅并跳 Stripe；收到已验签且确认已付款的事件后开始生成            | 与普通用户相同的付费购买流程；取消 Code 输入和测试分支                                                           | Stripe 收款后 SeeAPI 异步任务               |

V1 和 V2 共用订单、任务状态、视频领取、通知与恢复机制。V1 的 `FountainChan` **不是秘密、不是授权凭证**；必须服务端验证管理员身份。V1 最多每管理员 3 次、全环境 10 次**成功提交任务**，并设服务端紧急暂停；调用超时且结果不明时保留同一幂等键，查明任务是否创建后再核算额度，绝不通过重复点击绕过预算。V1 普通访客不可调用测试 API。V2 下线 Code 入口和服务端免付费生成路由（或在服务端永久关闭并拒绝），而非只隐藏控件。V1 既然在生产域名执行，应先修复生产持久化数据库，不允许拿 `/tmp` SQLite 测试后误判流程可靠。

非目标：宠物/多人/多模板、用户修改提示词、套餐/订阅/积分销售、同时生成双画幅、Google Drive 备份、完整聊天工作台改造。现有通用功能若仍被其他页面使用，暂不删除底层代码，只移出本产品公开购买路径。

## 2. 事实、风险与上线前验证关卡

1. `src/blocks/hero.tsx` 两图目前仅 `FileReader` 本地预览；`handleStripeCheckout` 读取 `res.url`，但 `src/routes/api/payment/checkout.ts` 返回 `checkout_url`；用户图片从未绑定购买。`src/routes/index.tsx` 会把已登录者重定向 `/chat`，会阻断 V1 管理员从首页测试。
2. 当前 `src/routes/api/payment/checkout.ts` 强制登录；`src/modules/payment/service.ts` 的通用结账需 `userId` 并发放 credits，不能直接把其已有回调当成“游客支付后生成”。独立的产品订单和履约边界必须可辨识，不触发积分发放。
3. `src/core/db/sqlite.ts` 在 Vercel 将本地 SQLite 复制至 `/tmp`，实例间不共享且不能持久保存订单；`init-sql.ts` 异步执行、不等待且遗漏表。生产必须迁往**托管持久数据库**，优先评估现有 `@libsql/client` 兼容的 Turso；切换前检查 schema、Drizzle 迁移、权限种子、会话与生产数据迁移计划。不能以“首次请求自动建表”替代迁移。
4. `src/modules/agent/tools.ts` 的通用聊天任务会在单次 SSE 请求内轮询，将整段视频读入内存再上传公开 R2 URL；这**不是**订单后台恢复器，不能直接复用该执行模型。
5. [SeeAPI 文档](https://www.seeapi.com/docs/getting-started/)说明 `POST /v1/generations` 为异步提交，保存 `generation.id`，查询 `GET /v1/generations/{task_id}` 的真实状态；创建时必须使用持久化的 `Idempotency-Key`，不因查询失败重建任务。[任务结果](https://www.seeapi.com/docs/get-task-detail/)提供 `assets[]` 视频 URL，当前称无统一自动过期，但资产可有 `expires_at` 且平台不承诺长期备份；URL 可匿名访问。**两张单人肖像不等于视频首尾帧**，必须先验证具体模型是否支持两个人身份、剧情转场、25 秒、两种画幅、720p 与无水印。必要时评估分镜图/多片段拼接；未核实的能力不写成已具备功能。
6. [竞品一](https://zombieaitrend.com/)公开标称两人、25 秒、720p、自然场景音、$4.99、14 天下载、9:16/16:9；[竞品二](https://zombielovestoryai.com/)的视频结账仍未开放。参考其用户流程，不复制其视频或声称其实际成片质量已验证。首页示例视频必须是拥有展示权的**自有样片**；没有样片时不拿竞品素材填充。
7. **先做成本验证**：用选定 SeeAPI 模型及 provider 查询实时价格和账户权限，再用经用户确认的预算做两种画幅真实样片；记录每条实际 credit、失败成本、Stripe 手续费和成功率。若无法按 $4.99 售价稳定交付约定规格，则 V2 不收款，向用户重新确定规格或售价；不能默默降为短片。管理员 3 次测试额度不足时须通过明确审批上调，不暗改限制。

## 3. 数据模型与权限边界

建议新增独立 `zombieVideoOrder`（名称可依仓库命名规范确定），字段包含：随机订单 ID、来源 `admin_test|stripe`、服务端固定价格/币种、付款状态、生成状态、选定画幅、两张图片私有对象键、SeeAPI 模型/provider/请求参数版本及幂等键、SeeAPI 任务 ID、资产 ID/URL/有效期、可选通知邮箱、通知状态/重试时刻、完成时间、下载截止时间、故障原因码/下次重试/租约、时间戳。测试来源的零金额**绝不标记为 Stripe paid**。Stripe Session ID、Payment Intent ID 分别按实际数据建唯一约束，订单到 SeeAPI 任务是一对一逻辑；Webhook Event ID 可另作去重，但仍必须依业务订单/Session 唯一性阻止重复生成。邮箱不得用来猜出他人订单。

游客访问：创建草稿时生成不可猜测的高熵领取凭证，只存哈希，浏览器仅保存凭证及私有订单入口；服务端通过凭证校验订单，私有链接视同领取权，避免日志、第三方分析、Referer、公开分享及搜索引擎泄漏。邮件（若填写）发送的领取链接另发一次性或可撤销凭证，发送前确认邮箱；订单编号本身不得授权访问。可选邮箱为空时不发送邮件，结账前明示“清除浏览器数据、无邮箱且未保存私有链接时可能无法自行找回”。支付页/生成页不公开原始图片对象键或供应商 API key。管理员通过 RBAC 会话与明确权限访问测试订单。

状态边界：`draft → checkout_pending → paid → queued → submitted → processing → succeeded | failed_needs_attention | refunded`；`admin_test` 从独立授权检查后进入 `queued`，绝不经过 `paid`。另有 `notification_pending → sent | retry_due`，邮件失败不重启生成。取消支付保持 `checkout_pending` 或进入 `canceled`，不能提交 SeeAPI；支付页重定向**不证明**支付成功。用户端只显示“待支付/排队中/生成中/可下载/失败处理中/已过期”等可理解状态，不泄漏内部任务 ID。

媒体存放决策：V1/V2 首版均按 **A：生成视频留在 SeeAPI**，持久数据库保存资产引用；用户在经授权的订单页领取视频。自有存储仅负责原始肖像（选私有对象存储，如 R2，少量图片起步可使用免费额度）。**14 天是本站订单入口的开放期限，从成片完成时算；不是 SeeAPI 文件自动删除承诺。** 不得写“14 天后视频已彻底删除”。直链一旦流出仍可能访问；为降低扩散风险需评估下载代理/短时转址的带宽及上游链接匿名性，但不以 Vercel Function 直接长期代理大视频作为默认实现。成片可用性及上游资产保留必须在开放 V2 前得到实测/供应商政策确认；若不能保障整个 14 天，应改用自有对象存储或重新向用户确认交付承诺。原始肖像：成功交付后 24 小时删除；技术失败待处理最多保留 7 天，超期删除并人工处理/退款；失败但仍在安全重试期间不可提前删图。清理任务须有失败补偿及可核验记录；供应商留存按其政策另行披露。

## 4. 实施单元（按依赖次序，各单元独立验证）

### 测试分层与自动化边界

所有单元的测试场景统一标注类型，避免把人工验收伪装成自动化验证：

| 标签            | 覆盖内容                                                                                     | 运行方式                                                               | 进 CI           |
| --------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------- |
| `[unit]`        | 纯逻辑/状态机/计算：状态迁移、幂等判定、14 天·24 小时·7 天边界、价格常量、权限判定、上传校验 | vitest `node` 环境，**无网络无 DB**                                    | ✅ 每次提交必跑 |
| `[integration]` | HTTP handler 与 service 行为：checkout、webhook 验签、上传校验、凭证鉴权、worker 认领        | 内存 libsql 建表 + msw 打桩 SeeAPI/Stripe/Resend，直调 handler/service | ✅ 每次提交必跑 |
| `[manual-gate]` | 依赖真实外部服务或人工判断的场景                                                             | 一次性执行并留证据                                                     | ❌ 人工闸门     |

`[manual-gate]` **不是自动化验证**，包括：真实 SeeAPI 样片（两人一致／25 秒／720p／无水印／两种画幅）、真实 Stripe 小额付款与 CLI 签名事件、Resend 真实发送、生产库重启后订单可读、上游视频 14 天实际可用性、移动端播放样片、浏览器端可见性。这些必须在第 5 节闸门逐项登记执行人、时间、结果与证据；**不得因为无法自动化就默认通过**。

**硬性可测试性要求（全单元适用）：** 路由文件只做「解析请求 → 调 service → 返回响应」；业务逻辑抽入 `src/modules/zombie-orders/*`、`src/modules/zombie-video/*` 等可 import 的函数，并通过参数或工厂注入 `db`、`seeapiClient`、`stripeClient`、`mailer`、`storage`、`now()`、`genId()`。**禁止**模块顶层直接 `fetch` 外部域名、直连真实库、或把 `new Date()` 当作唯一时间源——否则对应测试无法编写。U0 提供这些接缝的测试替身。

### U0 — 测试基座与可测试性接缝

**位置：**`vitest.config.ts`、`package.json`（新增 `test:integration` 脚本）；新增 `src/test/setup-db.ts`、`src/test/msw-handlers.ts`、`src/test/fakes.ts`、`src/test/clock.ts`、`.github/workflows/test.yaml`；`src/**/*.test.ts` 内区分单测与集成测试目录/命名。

**方案：**保留 `environment: 'node'` 的单测档为默认 `pnpm test`（仅纯逻辑）；新增 integration 档——内存 libsql 按 `src/config/db/schema.sqlite.ts` 建表、msw 拦截 `api.seeapi.com`／`api.stripe.com`／`api.resend.com`、可注入 clock 推进时间以复现 14 天／24 小时／7 天边界。msw handler 默认对**未声明的外部请求直接报错**，防止测试偷偷联网。本次**不引入浏览器 E2E**（不新增 Playwright）；组件级交互场景一律归入 `[manual-gate]` 并显式标注。

**测试（基座自身）：**

- `[integration]` 空库建表后的 schema 与生产迁移结果一致。
- `[integration]` 未声明的外部域名被请求时测试失败，而非静默放过。
- `[unit]` 注入固定 clock 后 14 天／24 小时／7 天边界可稳定复现。
- `[integration]` 断网环境下 `pnpm test` 仍全绿。

**验证：**CI 上 `pnpm test` 通过且无网络依赖；任一测试若直连真实外部域名会立即失败；至少一个 service 测试使用了 `fakes.ts` 的替身。

### U1 — 持久化与生产配置基线

**位置：**`src/core/db/index.ts`、`src/core/db/sqlite.ts`、`src/config/db/schema.sqlite.ts`、`drizzle.config.ts`、`scripts/init-rbac.ts`、`scripts/assign-role.ts`、`.env.example`；新增受版本控制的迁移文件（现有 `.gitignore` 忽略 `/drizzle/`，必须调整），以及 `src/modules/zombie-orders/*.test.ts`。

**方案：**选择并验证外部 LibSQL 连接与生产持久化、可重复执行迁移、测试/正式数据隔离、密钥加密及最小权限。现有线上 `/tmp` 数据可能在不同实例中不一致；先只读盘点用户/订单/配置，禁止默认迁移陈旧打包 `data/local.db` 覆盖新库。迁移 RBAC 后核实管理员实际拥有 `*` 权限，失败脚本不得仍返回成功退出码；保护生产数据库备份与回滚。代码中的 `init-sql.ts` 不再承担生产迁移职责。

**可测试性：**`src/core/db` 的建连接受传入的 `database_url`/client，使 integration 测试可指向内存库；迁移与种子脚本可从测试中调用并返回退出码，而非直接 `process.exit(0)`。

**测试：**

- `[integration]` 同一内存库上两个独立连接实例共见同一份草稿订单（模拟跨实例持久化）。
- `[integration]` 并发创建订单不产生冲突或唯一键重复。
- `[integration]` 迁移未执行到期望版本时，开放购买路径被拒绝。
- `[integration]` 迁移可重复执行且结果幂等。
- `[unit]` 普通角色对管理员 API 的权限判定返回拒绝。
- `[integration]` 种子/迁移脚本失败时返回非零退出码（而非 catch 后仍 0）。
- `[integration]` `VERCEL=1` 且未配置外部库时，代码不静默回退到 `/tmp` 建“假生产库”。
- `[manual-gate]` 生产库真实重启/重新部署后订单仍可读（须在 Vercel 实测并留证据）。

### U2 — 双图上传、隐私与可领取的游客订单

**位置：**`src/blocks/hero.tsx`、`src/routes/index.tsx`、`src/blocks/header.tsx`、`src/config/db/schema.sqlite.ts`；新增 `src/routes/api/zombie/orders.ts`、`src/routes/api/zombie/orders.$orderId.ts`、`src/routes/api/zombie/upload.ts`、`src/routes/zombie/orders.$orderId.tsx`、`src/modules/zombie-orders/service.ts`、`src/modules/zombie-orders/service.test.ts`、`src/routes/api/zombie/orders.test.ts`；评估复用 `src/core/storage/r2.ts`，但不能复用其公开链接权限设置。

**方案：**V1 普通访客照片始终留在本机，管理员登录后才显示可调用上传/测试界面；V2 用户选择两张图片和画幅后，服务端验证 JPG/PNG/WebP、单张不超过 10 MB、尺寸下限与真实文件类型，上传私有存储并记录两张对象键。不得把 base64 放入订单库或日志。校验成年人授权声明、角色顺序、限流及资源滥用；浏览器可刷新、可复制私有订单链接，同一浏览器“我的订单”列出已保存入口。管理员登录后也留在首页而非自动跳 `/chat`。已上传但未结账草稿设置短时清理，草稿不能调用生成。视频结果页展示进度、预览/下载和截止时间，失效后拒绝领取。

**可测试性：**上传校验（类型/大小/尺寸/顺序/数量）抽为纯函数；订单鉴权抽为纯函数 `shouldGrantAccess(order, credential, now)`；首页重定向规则抽为纯函数，而非直接读 `document.cookie`；私有存储与对象键通过注入的 `storage` 替身。

**测试：**

- `[unit]` 上传校验：合法两张通过；仅一张、伪装 MIME、超 10 MB、小于尺寸下限、不支持格式分别被拒。
- `[unit]` 订单鉴权：正确凭证在有效期内放行；错误/缺失/猜测订单号被拒；证书过期后拒绝。
- `[unit]` 14 天边界：`completed_at + 14d` 前 1 秒可领取，等于及之后拒绝（用注入 clock）。
- `[unit]` 重定向规则：管理员会话不跳 `/chat`，普通会话按既有规则处理。
- `[integration]` 两张图片按上传顺序绑定订单，对象键为私有而非公开 URL。
- `[integration]` 游客 A 的凭证不能读取游客 B 的照片或视频。
- `[integration]` 服务端忽略客户端传入的画幅/价格，以订单记录为准。
- `[integration]` V1 模式下普通访客上传端点返回拒绝，且不落任何文件。
- `[integration]` 未结账草稿到期后被清理，且不能触发生成。
- `[manual-gate]` 公网 `zombie-love.com` 上管理员登录后仍停留在首页（浏览器实测）。

### U3 — SeeAPI 能力试验与可恢复任务

**位置：**新增 `src/modules/zombie-video/seeapi.ts`、`src/modules/zombie-video/worker.ts`、`src/modules/zombie-video/seeapi.test.ts`、`src/modules/zombie-video/worker.test.ts`、`src/routes/api/internal/zombie-jobs.ts`；按部署实际能力新增 `vercel.json` 或等效生产调度配置，`src/config/index.ts` 只读取 `SEE_API_KEY` 的服务端值（名称需与既有配置核对，不打印）。

**方案：**先用真实授权小样验证所选模型协议和双人剧情，必要时引入前置合成分镜图/拼接步骤且记录每一步费用与失败状态；不把“两张图等于首尾帧”硬编码。提交任务持久化原始请求版本、稳定幂等键和任务 ID；创建超时必须使用同一幂等键与完全相同请求体重试。查到 `processing` 继续等待；`succeeded` 检查实际视频资产、规格和 `expires_at`；`failed/canceled/refunded/expired` 分支分别处理。通过数据库原子租约避免 Vercel 重叠调度重复提交，定时扫描及人工补偿可恢复断线/部署后的任务。SeeAPI `callback_url` 仅在官方验签协议明确后启用；初版用授权的轮询补偿即可。任务逾期是“需查询/人工处理”，不能凭本地等待超时重复扣费生成。调度不承诺精确分钟级 ETA。

**可测试性：**SeeAPI client 必须接受注入的 `fetch`/`baseUrl`（或由 msw 拦截）；worker 认领走可注入的 `db` 与 `clock`；任务状态机为纯函数。禁止把 `fetch` 直接写在路由里。

**测试：**

- `[integration]` 202 响应保存 `generation.id` 并进入 `submitted/processing`。
- `[integration]` 创建请求结果不确定时，用相同 `Idempotency-Key` 与相同请求体重放只产生一条任务。
- `[integration]` 429/503 按退避重试；401/403/402 标记人工处理且不再自动重试。
- `[unit]` 查询返回 200 但状态 `processing` 不得判定为成功。
- `[unit]` `succeeded` 但 `assets[]` 无 `video` 资产时不发成功通知。
- `[integration]` 重复/乱序回调不改变已确定的终态。
- `[integration]` 两个调度实例并发扫描，仅一个通过租约认领该任务。
- `[integration]` 模拟进程崩溃后下一轮继续轮询同一旧任务，而非新建任务。
- `[unit]` 视频 URL 已失效且未交付时，闸门判定为「不可开放收款」。
- `[manual-gate]` 真实 SeeAPI 账户权限、可用模型、双人样片效果与单条成本（显式预算，留证据）。

### U4 — V1 管理员 Code 与生产域名保护

**位置：**`src/blocks/hero.tsx`、`src/modules/rbac/service.ts`、`src/config/index.ts`；新增 `src/routes/api/zombie/admin-test.ts`、`src/routes/api/zombie/admin-test.test.ts`；复用 U1–U3 订单/任务逻辑。

**方案：**服务端 `MVP_MODE=admin_test` 控制 V1；管理员身份和权限在服务端验证，Code 与时效/额度仅是额外门槛，不能独立放行；全局开关关闭即拒绝，持久库原子计数以 SeeAPI 成功提交为准，超时不明确则占用预约额度直到确认。无邮箱测试也能通过私有订单页取片；提供管理员测试专用禁用与观测。V1 不创建 Stripe 订单、不发放积分、不对公众暴露收费入口；不得依赖前端隐藏防止绕过。上线前核验现有 RBAC 种子真实可用。

**可测试性：**授权判定抽为纯函数 `authorizeAdminTest({session, role, mode, code, quota, now})`；额度计数走可注入 db 的原子操作；模式开关来自可注入 config。

**测试：**

- `[unit]` 未登录/普通用户即使 Code 正确也被拒（授权以角色为准，Code 不独立放行）。
- `[unit]` 错误 Code、模式开关关闭、超出个人 3 次、全站 10 次分别被拒。
- `[integration]` 并发同时提交时，原子计数不会让总提交超过上限。
- `[integration]` 请求重放（同一幂等键）只产生一条任务，不重复扣额度。
- `[integration]` 管理员合法首次调用创建**零金额、非 paid** 的测试订单并进入 `queued`。
- `[integration]` V2 模式下 admin-test 路由被拒绝。
- `[manual-gate]` 公网 `zombie-love.com` 上普通访客确实看不到购买按钮与 Code 输入框（浏览器实测）。

### U5 — V2 Stripe 游客一次性收款与幂等履约

**位置：**`src/config/pricing.ts`（`zombie_single` 改为服务端 499 美分且不对外售卖另两档）；`src/blocks/hero.tsx`、`src/routes/api/payment/notify/$provider.ts`、`src/core/payment/stripe.ts`；新增独立 `src/routes/api/zombie/checkout.ts`、`src/modules/zombie-orders/payment.ts`、`src/modules/zombie-orders/payment.test.ts`、`src/routes/api/zombie/checkout.test.ts`。检查 `src/routes/api/payment/callback.ts`：新产品成功页只展示“待 webhook 确认”，不能从浏览器回调触发生成。旧 `src/routes/api/payment/checkout.ts` 保留给其他原有商品，避免用自动积分发放链路处理该产品。

**方案：**服务端只认固定商品、价格和币种，禁止前端传价；游客可选邮箱，Stripe Checkout Session 与产品订单一对一，使用幂等键和 Session 唯一约束。原始请求体验签 Stripe webhook，仅 `payment_status=paid` 后原子置为待生成；同时处理延迟付款成功/失败、重复事件及乱序通知。不在 webhook 中等待 SeeAPI 或发邮件；支付取消/失败从不生成。V2 模式在服务端禁止 Code 免付费路径。Stripe 测试模式与生产密钥/Webhook Secret 分开；禁止“测试金额覆盖”影响 $4.99 生产售价。核对结账页面收集可选邮箱的含义与 Stripe 必填的收据邮箱，若 Stripe 本身强制收集，必须调整 UX 文案而不是虚称全流程无邮箱。

**可测试性：**Stripe 调用走注入 client 或 msw；webhook 验签所需的 `signingSecret` 可注入；handler 只做「验签 → 调 service → 返回」；订单状态机与时间可注入。

**测试：**

- `[integration]` 游客携两图、无登录可创建 Checkout，响应含 `checkout_url` 字段（覆盖此前 `res.url` 字段错配）。
- `[integration]` 客户端传入任意价格/画幅均被忽略，订单金额恒为服务端 499 美分。
- `[integration]` 未付款、已取消、伪造签名/篡改 payload 的 webhook 均不触发生成。
- `[integration]` 重复 `checkout.session.completed` 与 `async_payment_succeeded` 乱序到达，最多提交一条生成任务。
- `[integration]` 付款成功但用户未回跳时仍会生成；回跳早于 webhook 时订单页显示「待确认」而非「已付款」。
- `[integration]` 数据库写入失败时 webhook 返回可重试状态，订单不丢失。
- `[integration]` V2 模式下免付费路由被拒绝。
- `[manual-gate]` Stripe test mode 真实跳转 + CLI 签名事件 + 生产小额真实付款（金额与预算另行确认，留证据）。

### U6 — 邮件、媒体到期与落地页示例

**位置：**`src/core/email/resend.ts`、`src/blocks/hero.tsx`、`src/blocks/header.tsx`；新增 `src/modules/zombie-orders/notification.ts`、`src/modules/zombie-orders/retention.ts`、`src/modules/zombie-orders/notification.test.ts`、`src/modules/zombie-orders/retention.test.ts`；样片文件放可控媒体存储（路径/许可信息在上线前核对），落地页仅引用拥有展示权的原创样片；更新网站隐私/服务条款的实际落点与 `.env.example` 变量名，不写凭据。

**方案：**Resend 发件域验证通过后，有邮箱且成功出片才发“已完成”通知及私有领取页链接；无邮箱不发信。邮件失败不重生视频，通知独立重试及人工补发；V1 管理员也验证一次邮件。14 天从 `completed_at` 算，订单页与邮件都展示截止时间；到期禁止再次发放本站入口，原始肖像按前述期限删除，清理失败可补偿且具可审计日志。明确说明 SeeAPI 直链可能继续存在、上游留存独立，不宣称彻底删除。网页展示样片要遵守实际规格且可在移动端播放，未取得样片时不以竞品视频冒充。

**可测试性：**邮件发送走注入 `mailer`；保留期计算与清理选择抽为「注入 clock 的纯函数 + 可注入 storage/db」。

**测试：**

- `[integration]` 有邮箱且成功出片时恰好发送一次通知；空邮箱时完全不发送。
- `[integration]` 邮件接口报错时仅重试通知状态，视频仍可领取，且不重新生成视频。
- `[integration]` 重复任务事件（幂等键相同）不产生重复通知。
- `[unit]` 保留期计算：`completed_at + 14d` 前可访问、到点拒绝；已付款但未完成时不因「付款满 14 天」提前过期。
- `[unit]` 肖像清理规则：成功交付后 24 小时删除；技术失败待处理保留至 7 天，超期标记人工处理。
- `[integration]` 清理任务重复执行不会误删其他订单，也不会删掉仍在 7 天重试窗口内所需的图片。
- `[manual-gate]` 样片在真实移动端可播放；未取得样片时显示替代内容（浏览器实测）。

## 5. 发布、验收与回滚

**自动化门禁（先决于 V1 与 V2）：**`pnpm test`（含 U0 的 `[unit]` + `[integration]` 两档）必须在每个提交上全绿，并通过 CI（`.github/workflows/test.yaml`）。任何 feature 单元的 `[unit]`/`[integration]` 用例缺失、被 skip 或断网仍能通过测试，均视为该单元未完成。`[manual-gate]` 项须在本节逐项登记执行人、时间、结果与证据链接，未登记不得进入 V2。**注意：仓库当前无测试 CI 门禁、无集成测试基座、无 E2E，U0 未完成前不得宣称任何端到端可用性。**

**V1 先决条件：**外部持久数据库与迁移就绪、对象存储私有照片上传、管理员 RBAC 可用、敏感配置仅服务端可读、真实 SeeAPI 账户权限与预算确认、请求/任务幂等、任务恢复、私有订单链接、Resend 发件域验证。生产 `zombie-love.com` 普通访客仅见“即将开放”，不得误入 Stripe 或测试接口；在样片尚未验证时不展示无法保证的 25 秒/无水印销售承诺。观察提交数、任务终态、单条成本、画幅与成片质量；紧急停止开关必须可立即关闭后续生成而不影响查询已存在订单。

**V2 收款闸门：**双方画幅实测确认两人可辨认/所需剧情、25 秒、720p、无水印及利润空间；两种格式的真实下载均成功；Stripe webhook 验签/至少一次/乱序测试、退款与人工处理路径、浏览器订单找回、无邮箱分支、邮件通知、14 天实际可用性、断线及部署后恢复、权限与隐私安全全部通过。任何一项不满足，公众购买继续关闭；无权在运行中悄然改售价或规格。切换模式时保留 V1 测试订单查询与其到期逻辑，正式订单不发放积分；可快速回滚到只读/停止购买，不删除待交付订单。上线后监测：已付未提交、提交超过 SLA、成功但无可下载视频、通知积压、图片清理失败、上游 URL 404 和 Stripe webhook 错误。

## 6. 暂不伪装为已解决的风险

- SeeAPI 对两名真人肖像的多镜头身份一致性、商业使用与内容政策、最终成片成本和匿名 URL 是否稳定至少 14 天尚未完成真实样片与供应商验证；V1 就是为了测它们。若选定模型只接收“首/尾场景帧”，必须先制定合法的分镜合成流程，不能直接塞两张不同人的肖像。
- A 方案的 SeeAPI 匿名直链意味着下载期、删除承诺与私密性不可能同时严格保证；如验证达不到要求，必须改选自有私有对象存储并重新审视成本（R2 的 10 GB 是免费额度，不是容量上限），或重新确认产品承诺。
- 托管数据库、邮件及 Stripe 的账户配置只能在实施/验收时安全核对，本文不读取或记录 `.env.local` 的密钥值。管理员权限不能单凭 `AGENTS.md` 宣称即算通过；该文件关于 `/tmp` 持久性及价目等既有描述应在实施时修正。
- Google Drive 已确定不进入 V1/V2 MVP。用户已有 5 TB 个人空间，但 Drive 授权、链接分享、限流与到期回收的成本高于目前收益，后续有实际体量后再评估备份方案。

## 7. 依据

- 项目现状：`src/blocks/hero.tsx`、`src/routes/index.tsx`、`src/routes/api/payment/checkout.ts`、`src/modules/payment/service.ts`、`src/modules/agent/tools.ts`、`src/core/db/sqlite.ts`、`src/modules/storage/service.ts`。
- 测试现状基线：`vitest.config.ts` 为 `environment: 'node'` 且仅收 `src/**/*.test.ts`；现存 6 个测试文件（`src/modules/agent/tools.test.ts`、`paywall.test.ts`、`history.test.ts`、`src/lib/agent.test.ts`、`agent-settings.test.ts`、`agent-chat.test.ts`）**全部是纯函数单测**，无路由/DB/外部服务测试；未安装 Playwright，无 E2E、无 jsdom/happy-dom、无测试 CI 工作流（仅 `docker-build.yaml`）。`msw` 已随依赖存在但未被使用。U0 即用于补齐此空缺。
- [SeeAPI 入门](https://www.seeapi.com/docs/getting-started/)、[生成任务](https://www.seeapi.com/docs/create-generation/)、[查询与资产](https://www.seeapi.com/docs/get-task-detail/)、[价格查询](https://www.seeapi.com/docs/list-model-prices/)。
- [Stripe Checkout 履约](https://docs.stripe.com/checkout/fulfillment)、[Webhook 幂等和验签](https://docs.stripe.com/webhooks)。
- [Vercel Cron 限制](https://vercel.com/docs/cron-jobs/manage-cron-jobs)、[函数运行时](https://vercel.com/docs/functions/runtimes)。
- [竞品一](https://zombieaitrend.com/)、[其隐私说明](https://zombieaitrend.com/privacy-policy)、[竞品二](https://zombielovestoryai.com/)；竞品信息仅作为页面声明参考，非实际服务效果保证。

**确认点：**请确认本文的两阶段范围、A 方案的私密性/14 天风险和 V2 收款闸门；确认后才开始实现。真实样片、账户资源开通、生产部署及任何付费调用仍需按实施阶段的明确预算与验证流程执行。
