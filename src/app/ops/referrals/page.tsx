import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ReferralOpsPanel } from "@/features/referral-tokens/components/referral-ops-panel";
import { verifyOpsReferralSession } from "@/lib/ops-referral-auth/account-auth";
import { getOpsReferralCookieName } from "@/lib/ops-referral-auth/session";

export default async function ReferralsPage() {
  await connection();
  const cookieStore = await cookies();
  const session = await verifyOpsReferralSession(
    cookieStore.get(getOpsReferralCookieName())?.value,
  );
  if (!session) {
    redirect("/ops/referrals/login");
  }
  return <ReferralOpsPanel />;
}
