# 首页样片与紧凑工作台验收

## 设计依据

参考目录：`D:/WorkDev/github_repositories/awesome-design-md/design-md/`。

- `runwayml/DESIGN.md`：影像作为主要证据，克制边框，不照搬全屏巨型 Hero。
- `linear.app/DESIGN.md`：紧凑操作区、细分隔线、低干扰表面层级。
- `stripe/DESIGN.md`：明确金额与购买单位，单一主操作。

沿用 IBM Plex Sans / Serif 与现有玫红主题。首屏组合短标题、样片、双人角色上传、25 秒生成规格、两种画幅、一次付费与私有订单说明；下方仅保留流程、折叠分镜及 FAQ。

## 媒体

- 授权来源：用户指定的 `ZombieLoveSample.mp4`，不使用 `photo/`。
- `public/videos/zombie-love-sample.mp4`：4,093,204 字节，21.037007 秒，1280×720，16:9，H.264 / AAC，faststart。
- `public/images/zombie-love-poster.jpg`：从样片第 13 秒提取。
- 转码保留全长与比例；使用 CRF 26、AAC 96k，不裁切剧情。
- 页面明确标注 21 秒演示与 25 秒生成规格的区别，不承诺生成结果一致。
- 不自动播放；支持 controls、playsInline、metadata 预载、海报和焦点。
- `.vercelignore` 未排除媒体；私有 R2 桶配置不变。

## 验证

- `pnpm build`、`pnpm exec tsc --noEmit`、`pnpm test`：通过，21 文件 / 180 测试。
- 新增回归：媒体属性、双上传角色、画幅、完整共享提示词、价格及订单入口。
- 四个业务函数与修改前 TypeScript AST 打印结果一致：`handleGenerate`、`handleFileUpload`、`rememberOrder`、`goToOrder`。
- Playwright 本地检查：1440×1000、390×844、320×740 无横向溢出；视频元数据及实际播放、画幅切换、空图阻止继续、分镜展开、移动导航通过。
- 合成 1 像素 PNG 仅用于本地预览与弹窗测试，未上传至服务器；弹窗聚焦、Esc 关闭通过。合成订单历史检查后已清理。
- 截图：`_local-tests/redesign-desktop.png`、`_local-tests/redesign-mobile.png`（不提交）。
- 本地构建预览未加载生产认证配置，最初 get-session 返回 500；交互验收使用明确的匿名会话 / live 模式响应替身，不能视为生产认证验收。
- Codex 外部只读审查两次因出口访问拒绝失败，未获得有效外部审查结论；随后完成独立差异复核与 AST 对比。

## 边界

未进行真实付款、SeeAPI 生成、真实照片上传或邮件交付。未修改模型、支付、订单状态机、价格常量、共享提示词及既有未提交文档。生产发布与 CI 结果以最终交付记录中的确切提交 / 标签运行链接为准。
