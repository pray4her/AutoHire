import type { Metadata } from "next";
import { headers } from "next/headers";

import { ReferralLanding } from "@/features/referral-tokens/components/referral-landing";
import {
  referralRequestContextFromHeaders,
  resolvePublicReferral,
} from "@/lib/referral-tokens/public-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "专家推荐 | GESF",
  description: "通过专家本人转发的推荐链接了解 GESF 并开始申报。",
};

type ReferralPageProps = {
  readonly searchParams: Promise<{
    readonly t?: string | readonly string[];
  }>;
};

export default async function ReferralPage({
  searchParams,
}: ReferralPageProps) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  const tokenValue = Array.isArray(params.t) ? params.t[0] : params.t;
  const referralToken = tokenValue ?? "";
  const result = await resolvePublicReferral(
    referralToken,
    referralRequestContextFromHeaders(requestHeaders),
  );

  return <ReferralLanding result={result} referralToken={referralToken} />;
}
