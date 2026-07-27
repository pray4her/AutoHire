# 07 — 推荐数据模型改为 Referrer 邮箱并清空旧数据

**What to build:** 将 Referral Token 从挂本系统 Application/Expert 改为挂 Referrer（`referrerEmail` + 可选 `referrerDisplayName`）；移除展示字段配置；每邮箱至多一个 ACTIVE。迁移中清空旧 token、点击日志、申报归因外键。账号轨/影子邀请不动。

**Blocked by:** None（可与 08 并行设计，合并迁移需协调）

**Status:** done

- [x] Schema：Token 归属改为 referrerEmail（+ optional displayName）；去掉 applicationId 归属与 displayFields；保留 ACTIVE/DISABLED、expiredAt、点击日志、Application.referralTokenId
- [x] 唯一约束：同一 referrerEmail 至多一个 ACTIVE
- [x] 迁移：清空旧 referral 相关数据后切到新列
- [x] 服务层/API 停止依赖「本系统专家档案」解析推荐人
- [x] 相关单元/route 测试按新模型改写；邀请轨与账号轨回归绿
