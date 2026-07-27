---
triage: ready-for-agent
feature: account-auth-and-referral
source: grill-with-docs session (pivot) + docs/adr/0001 + docs/adr/0003
---

# Spec: 账号轨与推荐裂变（Referrer 邮箱模型 + apply 壳）

## Problem Statement

平台需要开放注册账号轨，以及可控的单级推荐裂变。推荐人来自**内部另一套专家库**（非本系统 Expert）。一期实现曾把推荐挂在本系统专家档案上并做介绍落地页，与真实运营方式不符：ops 应用邮箱/Excel 批量生成链接，由内部同事线下发给推荐人再转发；朋友打开后应看到与邀请入口相似的申报页，而非专家介绍；上传简历前再注册/登录。

## Solution

**账号轨（已完成，ADR-0001，保持）**：邮箱+密码注册（验证码）、影子邀请挂申报、与链接轨合流。

**推荐裂变（按 ADR-0003 重做）**：独立 ops 生成页，按 Referrer 邮箱（+可选显示名）批量生成 Referral Token；1 链 N 友；朋友走 `/apply` 壳 → 上传前账号门禁 → 注册后影子申报 + 当场归因；生成页历史看漏斗；专家档案保留推荐来源列。清空旧 applicationId 模型数据与介绍落地页/档案内生成台。

## User Stories

### 账号轨（已交付，回归保护）

1–12 同前：开放注册、影子邀请、两轨不合并不拦截、链接轨零改动。（见既有 01–02）

### 推荐：ops 生成与历史

13. As a ops, I want 在独立页面用邮箱或 Excel（第一列邮箱，可选姓名列）批量生成推荐链接, so that 我不必在专家档案里搜索本系统专家
14. As a ops, I want 生成结果可复制以便内部同事线下发给推荐人, so that 系统无需发信
15. As a ops, I want 每位推荐人邮箱同时只有一个 ACTIVE token；再次导入已存在的邮箱则跳过并报告且可复制现链, so that 不会误轮换正在转发的链
16. As a ops, I want 可作废、续期、显式重新生成, so that 泄漏或轮换可控
17. As a ops, I want 在生成页看到历史 Token 行（状态、点击/注册/申报数）并展开下游注册账号及其申报粗档进度, so that 我能评估裂变效果

### 推荐：朋友侧

18. As a 朋友, I want 打开推荐链接后看到与带邀请 token 的 `/apply` 入口相似的页面（不出现推荐人信息）, so that 我知道下一步是申报而非浏览专家名片
19. As a 朋友, I want 点击准备上传简历时被要求注册或登录, so that 申报绑定账号
20. As a 朋友, I want 注册/登录完成后回到简历上传页（若已有更后进度则按状态机）, so that 我能继续申报
21. As a 已登录用户, I want 点推荐链接后直接进入上传/按状态机继续, so that 我不被强制重新注册；本次不补记归因
22. As a 点过期/作废链接的人, I want 看到体面失效页, so that 我不被技术错误吓退

### 推荐：归因

23. As a ops, I want 朋友在推荐上下文下完成注册时申报挂上该 Referral Token 归因, so that 能追溯推荐人
24. As a ops, I want 专家档案中看到申报的推荐来源（Referrer 显示名或邮箱）, so that 审档案时知情
25. As a 平台, I want 无上下文/上下文失效/已登录不补记时正常申报且不报错, so that 归因规则不阻断申报

## Implementation Decisions

### 保持不变（ADR-0001）

- Better Auth 账号轨、影子邀请、链接轨/ops 密码/审计认证零改动（邀请轨上传前不强制账号）

### 推荐数据模型（ADR-0003）

- Referral Token：哈希、`referrerEmail`（规范化）、可选 `referrerDisplayName`、ACTIVE/DISABLED、expiredAt（默认 90 天）、创建者；**移除**对 Application/Expert 的归属外键与展示字段配置
- 每 `referrerEmail` 至多一个 ACTIVE；批量冲突 = 跳过并报告
- 迁移：清空旧 referral token、点击日志、`Application.referralTokenId`
- 点击日志保留；归因仍为申报上可空 FK → Referral Token

### 朋友路径

- 公开解析：校验 token → 记点击 → 渲染 `/apply` 壳（无推荐人 PII）
- 「去上传」：未登录 → 写归因上下文 → 注册/登录 → 回 `/apply/resume`（或按状态机）
- 注册成功：影子邀请 + 申报 + 当场归因；注册前不建邀请/申报
- 已登录：不补归因

### Ops UI

- 新独立页：输入/Excel、生成、复制、作废/续期/重新生成、两级历史
- 移除：专家档案内推荐生成台、介绍落地页、展示字段勾选
- 专家档案保留推荐来源列（名/邮箱）
- 申报进度映射为运营粗档（非 17 态原文）

## Testing Decisions

- HTTP route 测试：批量生成（含跳过冲突）、作废/续期/重生成、公开壳解析与点击日志、归因绑定/失效容错/已登录不补记、邀请轨回归
- Playwright e2e：生成（邮箱）→ 朋友打开 apply 壳 → 注册 → 简历上传页 → 历史/档案可见归因与粗档
- 邮件仍用 recording fake；不测「系统发推荐邮件」（不存在）

## Out of Scope

- 对接内部专家库 API
- 系统向推荐人发信
- 多级裂变、长效 cookie 补归因、已登录补记
- 邀请链接轨账号门禁
- 专家自助复制页、推荐人看自己的转化面板
- 朋友侧展示推荐人信息

## Further Notes

- 术语以 CONTEXT.md 为准：Referrer ≠ Expert；见 ADR-0001、ADR-0003
- 01–06 已交付旧推荐形态；07+ 按本 spec 替换推荐部分，账号轨仅回归
