import type { Metadata } from "next";
import { headers } from "next/headers";

import { ReferralLanding } from "@/features/referral-tokens/components/referral-landing";
import {
  referralRequestContextFromHeaders,
  resolvePublicReferral,
} from "@/lib/referral-tokens/public-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Referral | GESF",
  description:
    "Open a GESF referral link and continue to the application entry.",
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
