import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageFrame, PageShell, StatusBanner } from "@/components/ui/page-shell";
import type { PublicReferralResult } from "@/lib/referral-tokens/public-service";

export function ReferralLanding({
  result,
  referralToken,
}: {
  result: PublicReferralResult;
  referralToken: string;
}) {
  if (result.status === "UNAVAILABLE") {
    return (
      <PageFrame>
        <PageShell
          title="Global Excellent Scientists Fund"
          description="推荐链接状态说明。"
          headerVariant="centered"
        >
          <StatusBanner
            tone="neutral"
            title="这条推荐链接暂时不可用"
            description="链接可能已过期或已失效。你仍可直接注册账号并开始申报。"
          />
        </PageShell>
      </PageFrame>
    );
  }
  const signupHref = `/api/referrals/context?t=${encodeURIComponent(referralToken)}`;
  const loginHref = `/api/referrals/context?t=${encodeURIComponent(referralToken)}&to=login`;
  return (
    <PageFrame>
      <PageShell
        title="Global Excellent Scientists Fund"
        description="完成账号注册后，即可上传简历并继续申报。"
        headerVariant="centered"
      >
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            开始你的申报
          </h1>
          <p className="text-muted-foreground leading-7">
            请先准备简历。开始上传前，我们会请你登录或注册账号，以便安全保存申报进度。
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button
              nativeButton={false}
              size="lg"
              render={<Link href={signupHref as never} />}
            >
              开始申报
            </Button>
            <Link
              href={loginHref as never}
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              已有账号？先登录
            </Link>
          </div>
        </div>
      </PageShell>
    </PageFrame>
  );
}
