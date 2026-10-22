# Stripe 正式支付切换验收

## 结果

- 生产域名：`https://zombie-love.com`，模式 `live`，未暂停，单条视频 499 美分。
- 最终部署：`dpl_2Hc8W9keJQZFpqoJUoqn12xehrN7`。
- 部署地址：`https://zombie-love-story-aarerbwev-fountainchans-projects.vercel.app`。
- 原沙盒回滚部署：`dpl_Go4QRb9iuyCJZMcpr7CgWwXxVcGq`，地址 `https://zombie-love-story-exmlgybka-fountainchans-projects.vercel.app`。
- 正式账户：`acct_1UQoQe4FQwUU46N8`，收款与提现均已启用。
- 正式 webhook：`we_1UTJwK4FQwUU46N8ZRTF05I1`。旧测试端点 `we_1USNY14AjMa6Jui14fSuWnor` 未删除。

## 验证证据

- 20 个测试文件、172 项测试通过，TypeScript 检查通过；本地和 Vercel 生产构建通过。
- Playwright 独立上下文显式使用本地代理，先通过 Google 门禁。
- 真实落地页选取两张合成测试 PNG，建单成功，两次浏览器 R2 PUT 均返回 200；未上传用户的 `photo/` 文件。
- 正式 Checkout 页面正常加载并显示 Live mode。服务端核验 `livemode=true`、`amount_total=499`、`currency=usd`、`payment_status=unpaid`。
- 测试订单 `zo_rWXlHSz9_vgdVuJr`，订单号 `ZLS-8D4415FDBC`。验收后通过 Stripe API 主动过期未付款会话。
- 真实事件 `evt_1UTK6R4FQwUU46N8G5yGImrp`，`pending_webhooks=0`；订单经真实 webhook 变为 `canceled`，未通过数据库伪造付款。
- 回跳 URL 仅带订单 ID，不含访问令牌；浏览器从本地存储恢复私有订单，重新部署后仍可读取，验证持久化。
- 东京 Turso `zombie-love` 只读查询成功，未发现 Stripe/R2 数据库配置覆盖项。
- SeeAPI 仅调用只读余额与模型接口，余额查询成功；未提交生成任务。
- 最终部署 `/api/zombie/mode` 返回 live；订单页正常；伪造 `x-vercel-cron` 返回 403；无签名 webhook 返回 400。
- 390px 移动端订单页无横向溢出；取消订单不再显示“正在生成”。

## 配置与安全

- `.env.local` 的 `STRIPE_TOKEN` 在进程内读取，通过 stdin 写入 Vercel 的 `STRIPE_SECRET_KEY`，没有输出密钥。
- 正式 webhook 的一次性 secret 创建后立即通过 stdin 保存为 `STRIPE_LIVE_SIGNING_SECRET`。保留现有 `STRIPE_SIGNING_SECRET` 专用于旧沙盒签名；正式与沙盒签名严格绑定事件环境。
- Zombie Stripe 配置以环境变量为先，避免数据库旧配置覆盖正式密钥；支持标准与受限密钥前缀。
- Checkout 使用订单级固定幂等键；状态写入增加条件更新，防止并发回退。
- 待付款订单不按年龄删除原图，等待 Stripe 终态事件后再清理；缺少存储不得标记已删除。草稿清理先条件认领；到期前十分钟停止签发五分钟上传链接及创建支付会话。
- 上传签名绑定长度、类型和禁止覆盖条件，支付前检查对象元数据与文件头。
- 新增 `CRON_SECRET` 和每日 UTC 03:00 的 Vercel Cron，订单页仍按需推进生成。
- `data/local.db` 只从 Git 索引移除，本地文件保留，部署排除本地数据库与环境文件。此操作不清除历史提交中的数据库副本，也未检查其内容。
- 安全扫描器修正了把删除数据库文件误报为新增泄漏的问题；暂存范围扫描无发现。
- README、AGENTS.md 的既有无关修改及 `photo/` 不纳入本次提交。

## 验收边界

- 未输入银行卡、未实际扣款、未触发 SeeAPI 付费生成。正式付款成功后的完整生成与邮件交付未在本次执行中验证，不能宣称完成真实扣款端到端验收。
- R2 验证使用合成图片，只证明上传和支付门槛，不证明人物识别或成片质量。
- Vercel Hobby 仅配置每日兜底；用户关闭订单页后，任务推进可能等到下一次定时调度。若需要及时后台交付，应配置更高频的授权外部调度或升级套餐。
- 测试对象随取消订单进入保留期清理；本次不主动调用会推进全体订单生成的 Cron 端点。
- 失败回滚可将生产域名提升回上述沙盒部署；环境变量变更不会反向修改旧部署快照。回滚后重新构建前须恢复匹配的沙盒模式和测试 API 密钥，不能直接用当前正式环境重建沙盒。
