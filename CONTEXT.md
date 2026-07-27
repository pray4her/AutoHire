# AutoHire

GESF 专家定向招募申报平台。核心领域是:运营方邀请专家申报,专家提交简历与材料,系统初审,运营方管理专家档案。

## Language

### 身份与准入

**Expert(专家)**:
被邀请申报 GESF 的人,即申报者本人。不是系统登录用户——链接轨专家仅凭邀请链接访问,没有账号。
_Avoid_: applicant, user, candidate

**Invitation(邀请)**:
一份"允许某专家发起一份申报"的资格凭证。由 ops 批量生成或系统自生,一份邀请至多对应一份申报。
_Avoid_: invite token, invite link(token 和链接只是邀请的传递形式)

**Invitation Track(链接轨)**:
专家凭邀请链接中的 token 换取签名会话、完成申报全流程的访问方式。无账号、无密码。
_Avoid_: legacy flow, token login

**Account Track(账号轨)**:
任何人以邮箱+密码注册账号(邮箱验证码验证),登录后发起申报的访问方式。账号注册时系统为其生成影子邀请。
_Avoid_: open sign-up, registered user flow

**Shadow Invitation(影子邀请)**:
账号轨用户注册时由系统自动生成的邀请,email 绑定注册邮箱,其 token 永不用于链接登录。存在的唯一目的是让账号轨申报能挂进现有的"一份邀请对应一份申报"结构。
_Avoid_: synthetic invite, auto invite

**Referrer(推荐人)**:
内部另一套专家库中的人,由 ops 用邮箱(及可选显示名)录入本系统,作为推荐链接的归属方。不是本系统的 Expert(申报者)。
_Avoid_: Expert, 推荐专家(易与申报专家混淆), referring expert in AutoHire DB

**Referral Token(推荐 token)**:
与某位 Referrer(邮箱 + 可选显示名)绑定的不透明随机串,用于生成推荐链接。一条有效链可服务多名朋友。带过期时间,ops 可作废、续期、重新生成。不挂本系统 Application/Expert。
_Avoid_: expert token, referral code, invite token

**Referral Link(推荐链接)**:
包含推荐 token 的公开链接。由内部同事线下发给 Referrer,再由其转发给朋友;朋友打开后进入与邀请链接相似的申报入口体验(非专家介绍页)。
_Avoid_: share link, forward link

### 申报

**Application(申报)**:
一位专家的一次完整申报流程及其全部数据(简历、分析、材料、状态机)。一份申报必然挂在一份邀请上。
_Avoid_: submission, application form

**Referral Attribution(推荐归因)**:
申报与推荐 token 的绑定关系,记录"这份申报由哪位 Referrer 的推荐而来"。仅在朋友经推荐链接同一会话内完成注册时建立(当场归因)。
_Avoid_: referral chain, referral tracking(单级,不存在多级链)

### 角色

**Ops(运营方)**:
平台内部运营人员。管理邀请批次、专家档案、推荐人与推荐 token,通过独立的 ops 密码登录访问后台。
_Avoid_: admin, staff, operator
