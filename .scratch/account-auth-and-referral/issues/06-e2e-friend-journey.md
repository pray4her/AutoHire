# 06 — e2e:朋友全链路

**What to build:** 一条 Playwright 端到端测试,跑通朋友视角完整旅程:ops 生成推荐链接 → 朋友点开链接看到专家信息 → 点"开始申报" → 注册(含邮箱验证码验证)→ 进入申报流程 → 归因在数据库/ops 视图可见。对照现有 application-flow e2e 的基建(workers: 1,等待数据绑定的 UI)。

**Blocked by:** 05 — 推荐归因

**Status:** ready-for-agent

- [x] e2e 覆盖:生成推荐链接 → 落地页展示 → 注册(含邮箱验证)→ 进入申报
- [x] 断言归因落库且 ops 视图可见
- [x] 测试在现有 Playwright 基建上运行通过(workers: 1)
- [x] 邮件验证码通过测试基建(recording fake / 测试钩子)获取
