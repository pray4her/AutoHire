# 推荐页独立鉴权；档案/邀请共用单一账号

Status: accepted（收窄 [ADR-0004](./0004-multi-ops-account-referral-isolation.md)：多账号与推荐隔离仅作用于推荐页；专家档案与邀请恢复并保持单一共用 Ops Account 会话）

`/ops/referrals` 使用独立 cookie、独立账号表（OpsReferralAccount）与独立 env 名单（`OPS_REFERRAL_USERNAME` 逗号分隔多账号）。推荐 token 的 `createdBy` 使用 `ops-referral:` digest。推荐页提供改密 UI。`/ops/expert-files` 与 `/ops/invitations` 继续共用 `OPS_EXPERT_FILES_*` 单一用户名会话，登录互不影响。历史用 `ops-expert-files:` digest 创建的 token 不做自动迁移。

## Considered Options

- **三页继续共用 cookie、仅推荐多账号**：与「推荐账号单独计算」冲突，被否。
- **档案/邀请也保留逗号名单**：产品要求两页「一个账号」登录，被否。

## Consequences

- 推荐登录入口为 `/ops/referrals/login`；专家档案登录 `next` 不再允许跳转到推荐页。
- e2e / 运维需分别配置 `OPS_REFERRAL_*` 与 `OPS_EXPERT_FILES_*`。
