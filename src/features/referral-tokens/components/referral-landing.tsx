import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import type { PublicReferralResult } from "@/lib/referral-tokens/public-service";
import styles from "./referral-landing.module.css";

type ReferralLandingProps = {
  readonly result: PublicReferralResult;
  readonly referralToken: string;
};

function ReferralBrand() {
  return (
    <div className="flex items-center gap-3" aria-label="GESF">
      <span className="grid size-10 place-items-center rounded-full border border-white/30 bg-white/10 text-sm font-semibold tracking-[0.16em] text-white">
        GF
      </span>
      <span className="leading-tight">
        <span className="block text-xs font-semibold tracking-[0.22em] text-emerald-200 uppercase">
          GESF
        </span>
        <span className="block text-[11px] tracking-[0.08em] text-slate-300">
          Global Excellent Scientists Fund
        </span>
      </span>
    </div>
  );
}

function UnavailableReferral() {
  return (
    <main
      lang="zh-CN"
      className={`${styles.surface} ${styles.invalidSurface} relative grid min-h-screen w-screen place-items-center overflow-hidden px-5 py-12 text-white`}
    >
      <div className={`${styles.invalidBackdrop} absolute inset-0`} />
      <section
        className={`${styles.glassCard} relative w-full max-w-xl p-8 sm:p-12`}
      >
        <ReferralBrand />
        <div className="mt-12 grid size-14 place-items-center rounded-2xl bg-amber-300/15 text-amber-200">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          这条推荐链接暂时不可用
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-slate-300">
          链接可能已过期或已被更新。你仍然可以直接注册账号，正常开始自己的 GESF
          申报。
        </p>
        <Link
          href="/signup"
          className={`${styles.secondaryAction} mt-8 inline-flex min-h-12 items-center gap-2 px-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}
        >
          直接开始申报
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <p className="mt-8 text-xs leading-5 text-slate-400">
          为保护专家信息，我们不会说明链接失效的具体原因。
        </p>
      </section>
    </main>
  );
}

export function ReferralLanding({
  result,
  referralToken,
}: ReferralLandingProps) {
  if (result.status === "UNAVAILABLE") {
    return <UnavailableReferral />;
  }

  const { expert } = result;
  const signupHref = {
    pathname: "/signup",
    query: { referral: referralToken },
  };

  return (
    <main
      lang="zh-CN"
      className={`${styles.surface} ${styles.paper} min-h-screen w-screen`}
    >
      <section
        className={`${styles.validHero} relative isolate overflow-hidden text-white`}
      >
        <div className="absolute top-0 right-[12%] -z-10 h-full w-px bg-white/10" />
        <div className="mx-auto max-w-6xl px-5 pt-7 pb-16 sm:px-8 sm:pt-10 sm:pb-24">
          <ReferralBrand />

          <div className="mt-16 grid items-end gap-12 lg:mt-24 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold tracking-[0.1em] text-emerald-100 uppercase">
                <BadgeCheck className="size-4" aria-hidden="true" />
                此链接由专家本人转发
              </div>
              <h1 className="mt-7 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] [overflow-wrap:anywhere] sm:text-6xl">
                来自 {expert.name} 的一份
                <span className="whitespace-nowrap">申报邀请</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                你被邀请了解
                GESF，并发起一份属于自己的专家申报。无需预先登录，注册后即可进入完整申报流程。
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href={signupHref}
                  className={`${styles.primaryAction} inline-flex min-h-13 items-center gap-3 px-7 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200`}
                >
                  开始申报
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <span className="text-sm text-slate-400">
                  约 2 分钟完成账号注册
                </span>
              </div>
            </div>

            <aside className={`${styles.glassCard} min-w-0 p-6 sm:p-8`}>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-emerald-200 uppercase">
                <Sparkles className="size-4" aria-hidden="true" />
                推荐专家
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-[-0.035em] break-words">
                {expert.name}
              </p>
              <dl className="mt-6 space-y-4 text-sm">
                {expert.title ? (
                  <div className="border-t border-white/10 pt-4">
                    <dt className="text-xs text-slate-400">专业头衔</dt>
                    <dd className="mt-1 text-base break-words text-white">
                      {expert.title}
                    </dd>
                  </div>
                ) : null}
                {expert.organization ? (
                  <div className="flex gap-3 border-t border-white/10 pt-4">
                    <Building2
                      className="mt-0.5 size-4 text-emerald-200"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-400">所在机构</dt>
                      <dd className="mt-1 text-base break-words text-white">
                        {expert.organization}
                      </dd>
                    </div>
                  </div>
                ) : null}
                {expert.email ? (
                  <div className="flex gap-3 border-t border-white/10 pt-4">
                    <Mail
                      className="mt-0.5 size-4 text-emerald-200"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-400">公开邮箱</dt>
                      <dd className="mt-1 text-base break-all text-white">
                        {expert.email}
                      </dd>
                    </div>
                  </div>
                ) : null}
                {expert.phone ? (
                  <div className="flex gap-3 border-t border-white/10 pt-4">
                    <Phone
                      className="mt-0.5 size-4 text-emerald-200"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-400">公开电话</dt>
                      <dd className="mt-1 text-base break-words text-white">
                        {expert.phone}
                      </dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-emerald-800 uppercase">
            About the program
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            让卓越研究走向更远的地方
          </h2>
        </div>
        <div className="space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
          <p>
            Global Excellent Scientists Fund
            面向具备国际视野与突出研究能力的专家，支持具有长期价值的科研探索与成果转化。
          </p>
          <p>
            申报将依次完成简历信息确认、资格初审与材料提交。平台会清晰提示每一步所需内容，并妥善保护你提交的信息。
          </p>
          <div
            className={`${styles.privacyNotice} flex items-start gap-3 rounded-2xl p-5 text-sm leading-6 text-slate-700`}
          >
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-emerald-800"
              aria-hidden="true"
            />
            <p>
              专家信息仅按运营方确认的公开范围展示；你的申报资料不会向推荐专家公开。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
