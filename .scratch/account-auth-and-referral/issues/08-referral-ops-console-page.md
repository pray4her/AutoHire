# 08 — 独立推荐生成页：邮箱/Excel + 历史漏斗

**What to build:** 新建独立 ops 页面（不挂在 expert-files）：支持粘贴邮箱或上传 Excel（第一列邮箱，可选姓名列）批量生成推荐链接；复制链接供内部同事线下发送（系统不发信）；已有 ACTIVE 的邮箱跳过并报告且可复制现链；作废/续期/显式重新生成。页面下列历史：Token 行（点击/注册/申报数）可展开下游账号 + 申报运营粗档进度。移除专家档案内旧推荐生成 UI。

**Blocked by:** 07 — 数据模型

**Status:** done

- [x] 独立路由与导航入口（ops 鉴权复用）
- [x] 批量生成 API：邮箱规范化、可选显示名、跳过冲突并返回现链；为支持历史/冲突复制，明文 token 持久化供 ops 复制
- [x] 作废 / 续期 / 重新生成 API
- [x] 历史列表 + 展开下游（账号邮箱、粗档进度）；粗档由 ApplicationStatus 映射
- [x] 移除 expert-files 上的 ReferralTokenConsole / 展示字段选择等
- [x] route 测试覆盖生成冲突、动作鉴权、历史聚合
