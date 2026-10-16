# AGENTS.md — Zombie Love Story AI (zombie-love.com)

> 本文件是 AI Agent（OpenCode / Claude Code / Codex 等）在此项目（`zombie-love-story-ai`）工作的**核心业务规范与首要上下文**。进行任何改动前必须通读本文。

---

## 一、项目概述与定位

- **项目名称**：Zombie Love Story AI
- **官网域名**：[https://zombie-love.com](https://zombie-love.com)
- **GitHub 组织仓库**：[https://github.com/VastNext/zombie-love-story-ai](https://github.com/VastNext/zombie-love-story-ai)
- **部署平台**：Vercel（生产环境绑定 `zombie-love.com` 与 `www.zombie-love.com`）
- **核心业务**：
  基于社交平台（TikTok、Instagram Reels、YouTube Shorts）爆发的 **“Zombie Love Story AI”** 病毒式短视频趋势，构建的商业化落地页平台与全栈 SaaS 引擎。
  用户上传两张肖像照（幸存者 + 伴侣/宠物），生成 25s（情侣）/ 15s（宠物）电影级 Hard Match-Cut 视频：从废墟对峙跌入阳光草地深情相拥。

---

## 二、架构与技术栈

- **前端与全栈框架**：TanStack Start (Vite 8 + Nitro Server, React 19, TypeScript strict)。
- **路由系统**：基于文件的端点管理（`src/routes/`）。无 RSC，无 `"use client"`，标准 React 组件与服务端 Loader。
- **设计风格规范**：参考 `awesome-design-md` 的 Linear 极简质感设计系统：
  - 极暗背景 `#010103`、发丝细线边框（`hairline-border`）、细腻微网格（`subtle-grid`）。
  - 双重微弱径向氛围光晕（玫瑰血色 `--brand-rose` 与暖阳金 `--brand-amber`）。
- **用户认证与鉴权（Auth & RBAC）**：
  - `better-auth` + Drizzle ORM。
  - 支持邮箱密码注册/登录、Google OAuth 登录、Google One Tap 快捷登录。
  - 内置超级管理员种子：`fountain.chan19@gmail.com`（全权限 `*`）。
- **支付网关体系（Payment Gateway）**：
  - 内核完整接入 **Stripe**（支持 Checkout Session、Webhook 回调、订单流水入库与 Credits 自动发放）。
  - 支持后台热配置（`/admin/settings` -> Payment 分组填写 Publishable Key / Secret Key / Webhook Secret）。
- **SEO 与长尾词矩阵**：
  - 覆盖关键词：`zombie love story ai`、`ai zombie video trend`、`zombie match cut ai video`、`ai zombie video generator`、`zombie dog trend`、`zombie pet ai video`、`zombie love story ai prompt`、`zombie love story reels editing`。
  - 内置三组高转化分镜提示词（支持一键复制到剪贴板，兼容 Sora / Luma / Kling / Runway）。

---

## 三、核心目录结构

```text
zombie-love-story-ai/
├── src/
│   ├── blocks/                  # 业务落地页组合区块
│   │   ├── header.tsx           # 顶部品牌条与平滑锚点导航
│   │   ├── hero.tsx             # 核心落地页交互（Hero/双图生成器/故事板/Prompt库/长尾词矩阵/定价/FAQ）
│   │   └── footer.tsx           # 底部版权与长尾词导航
│   ├── components/              # 基础 UI 与原子组件（shadcn/ui）
│   ├── config/
│   │   ├── index.ts             # 环境变量统一收敛层（含 Google Auth、Stripe、数据库配置）
│   │   ├── pricing.ts           # 权威定价单源（zombie_single $6.99, zombie_bundle $14.99, zombie_agency $29.99）
│   │   └── db/schema.sqlite.ts  # SQLite / Drizzle 数据表结构
│   ├── core/                    # 基础设施（auth, db, payment, storage, email）
│   ├── modules/                 # 业务服务层（payment, subscriptions, credits, config, rbac）
│   ├── routes/                  # 文件路由与服务端 API
│   │   ├── index.tsx            # 网站主页
│   │   ├── (auth)/              # 登录（sign-in）、注册（sign-up）页面
│   │   ├── admin/               # 管理后台（settings, users, payments, credits 等）
│   │   └── api/                 # REST API（/api/payment/checkout, /api/config/public 等）
│   ├── server.ts                # Nitro 服务端请求入口（含 better-auth 与 i18n 挂载拦截）
│   └── router.tsx               # TanStack Router 实例构造与路由重写
├── data/                        # SQLite 数据库文件（生产环境自动在 /tmp 恢复和校验建表）
└── drizzle/                     # Drizzle 迁移 SQL 记录
```

---

## 四、开发与运维指令

```bash
# 安装依赖
pnpm install

# 编译多语言消息（必须在代理环境下执行）
HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890 pnpm i18n:compile

# 检查代码与多语言
pnpm i18n:check
pnpm format

# 本地数据库结构推送与迁移
pnpm db:push
pnpm db:generate

# 权限分配（将用户设为管理员）
pnpm rbac:assign --email=user@example.com --role=super_admin

# 自动化测试
pnpm test

# 生产构建（必须全绿通过）
HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890 pnpm build

# 部署至 Vercel 生产环境
vercel deploy --prod --yes
```

---

## 五、重要规则与红线

1. **每一次改动必须提交 commit 并推送**：使用 Conventional Commits 规范（`feat:` / `fix:` / `chore:` 等），描述用简体中文。
2. **严禁泄露密钥**：禁止将 Google Client Secret、Stripe Secret Key、Auth Secret 等写入代码或公开提交，确保 `.gitignore` 包含 `*client_secret*.json` 及 `.env*`。
3. **保持端到端可用**：落地页的 6 个锚点（`#generator`, `#storyboard`, `#prompts`, `#longtail`, `#pricing`, `#faq`）、Google 登录流程、Stripe Checkout 跳转必须始终经过验证，不得随意破坏布局或删除业务功能。
4. **Vercel Serverless 特性兼容**：代码中若涉及 SQLite 读写，必须在 `/tmp` 可写路径进行缓存或调用 `init-sql.ts` 确保表结构就绪，避免因无盘环境导致 500。
