# 01 — 账号轨地基:Better Auth 接入与开放注册

**What to build:** 访客可以用邮箱+密码注册账号,注册时收到邮箱验证码并完成验证;注册成功后自动处于已登录状态;之后可以用邮箱+密码登录、登出,忘记密码时通过邮箱重置。邮件通过现有 nodemailer 通道发出。此工单结束时账号体系可用,但账号尚无申报上下文(那是 02)。ops 密码登录、邀请链接会话、审计看板认证三套机制完全不动。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 引入 Better Auth(Prisma adapter),新增 user / account / session / verification 四张表(纯增量,不改现有表),含迁移
- [x] 配置 BETTER_AUTH_SECRET(≥32 字符)与 BETTER_AUTH_URL,写入 .env.example 文档
- [x] 注册页:邮箱+密码+邮箱验证码,验证码邮件通过现有邮件通道发出(测试用 recording fake 断言)
- [x] 注册成功自动登录;登录页、登出、忘记密码/重置密码全流程可用
- [x] 会话有合理有效期;账号轨路由有鉴权保护
- [x] Better Auth 内置端点行为不重复测;集成边界(发信回调、Prisma adapter)有测试
- [x] 链接轨与 ops 既有测试全绿(回归)
