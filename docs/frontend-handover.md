# AutoHire 前端交接

> 给接手前端的同事：半天内能跑通主路径、知道改哪里。  
> 细节以代码与链出文档为准；本文不重复 [`CONTEXT.md`](../CONTEXT.md) / [`AGENTS.md`](../AGENTS.md)。

---

## 产品与范围

GESF 专家定向招募申报。本仓是 **Next.js 全栈**（页面 + BFF），前端主要面：

| 面 | 路由 | 说明 |
| --- | --- | --- |
| 落地页 | `/` | 英文获客 → `/signup` |
| 专家申报 | `/apply*` | 介绍 → CV Review → 材料 → 提交 → 补件 |
| 账号轨 | `/login` `/signup` … | Better Auth |
| 推荐入口 | `/referral?t=` | 继续时走账号门禁 |
| Ops | `/ops/*` | 档案 / 邀请 / 推荐 / 审计（中文） |

领域用词见 [`CONTEXT.md`](../CONTEXT.md)（Expert / Invitation / Ops，勿用 candidate/admin）。双轨准入见 [ADR-0001](./adr/0001-dual-track-auth-with-shadow-invitations.md)。

---

## 本地跑通

Windows + PowerShell；包管理用 **Bun**。

```powershell
Set-Location d:\zhangprj1\AutoHire
bun install
Copy-Item .env.example .env   # 若尚无
# 必填：OPS_EXPERT_FILES_USERNAME、OPS_EXPERT_FILES_INITIAL_PASSWORD（空则无法登录 Ops）
# 本地其余可保持 mock：FILE_STORAGE / RESUME_ANALYSIS / MATERIAL_REVIEW / ASK_AI
bun run dev                   # http://localhost:3000
```

**链接轨测试（推荐）**

1. 配置上述 `OPS_EXPERT_FILES_*`（与专家档案共用账号）
2. `/ops/invitations/login` → `/ops/invitations` 生成邀请
3. 复制 `inviteLink`（`/apply?t=...`），无痕窗口打开走完整申报流

命令：`bun run lint` · `bun run test` · `bun run test:e2e` · `bun run build`（更多见 [`AGENTS.md`](../AGENTS.md)）。

---

## 改代码去哪找

```
src/app/           # 路由页、layout、globals.css、api BFF
src/features/      # 业务 UI（按域，不按页面类型）
src/components/ui/ # shadcn + page-shell（申报流骨架）
```

| 场景 | 优先打开 |
| --- | --- |
| 申报状态 → 路由 | `src/features/application/route.ts` |
| 申报 API / 错误 | `src/features/application/client.ts` |
| CV 上传 / 校对 / 资格 | `.../cv-review-experience.tsx`（最大前端文件） |
| 申报壳 / FAQ | `.../apply-flow-chrome.tsx` |
| 视觉 token | `src/app/globals.css`（落地页与申报流两套，勿混用绿/金） |
| 落地页 | `src/features/landing/` |
| 补件 | `src/features/material-supplement/` |
| Ops 邀请 | `src/features/invitations/` |

专家主路径：`/apply` → `/apply/resume`+`/result`（同一 CV Review）→ `/apply/materials` → `/apply/submission-complete` → `/apply/supplement`。

Ops：`/ops/expert-files` 与 `/ops/invitations` 共用会话；`/ops/referrals` 独立（`OPS_REFERRAL_*`）。

---

## 约定（够用即可）

- **无**全局状态库：`useState` + `fetch(..., { credentials: "include" })`；封装在各 feature 的 `client.ts`
- 上传：`intent` → 浏览器 `PUT` 预签名 → `confirm`；材料并发 3
- 环境变量：服务端走 `src/lib/env.ts`，勿散落 `process.env`
- 栈：Next 16 · React 19 · Tailwind 4 · shadcn（Base UI：`render` 非 `asChild`）· Zod 4 · Bun
- `searchParams`/`params` 为 Promise（需 `await`）；已开 `typedRoutes`
- 专家 UI **英文**，Ops **中文**

---

## 测试注意

- 单测与源码同目录；DOM 测加 `// @vitest-environment jsdom`
- E2E：`workers: 1`；端口 **3100**（占用先杀残留 `next dev`）；等数据 UI，上传确认后再传下一文件
- 主路径：`tests/e2e/application-flow.spec.ts`

---

## 坑与现状（只列会踩的）

1. `APP_RUNTIME_MODE` 是 `auto|memory|prisma`，不是旧文档的 `mock|live`
2. Ask AI **未挂载**；申报流右下角是 FAQ，不是聊天
3. 二次分析 41 字段编辑 UI **未挂**专家页
4. 旧 `README` / `docs/02_PRD` / `docs/09_*` 过时；以 `CONTEXT.md` + 代码 + ADR + `openspec/specs/*` 为准
5. `docs/resume-process-secondary-generation-frontend.md` 不是本仓 UI

---

## 深读索引

| 需要时 | 看 |
| --- | --- |
| 用词 / 产品边界 | [`CONTEXT.md`](../CONTEXT.md) |
| 命令 / e2e | [`AGENTS.md`](../AGENTS.md) |
| 双轨 / 推荐 / Ops 分账 | `docs/adr/0001`–`0005` |
| 入口文案、抽取表、进度 UI | `openspec/specs/*` |
| 补件页规格 | `docs/ai-material-supplement-feature-spec/` |
| 埋点 | `specs/01`–`04` |

不确定产品口径（录取承诺、官方站声明、Ops 权限）时，先搜 `src/features/` 与 ADR，再问负责人。
