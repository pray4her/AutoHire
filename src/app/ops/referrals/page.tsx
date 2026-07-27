import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ReferralOpsPanel } from "@/features/referral-tokens/components/referral-ops-panel";
import { verifyOpsExpertFilesSession } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";

export default async function ReferralsPage() {
  await connection();
  const cookieStore = await cookies();
  const session = await verifyOpsExpertFilesSession(
    cookieStore.get(getOpsExpertFilesCookieName())?.value,
  );
  if (!session) {
    redirect("/ops/expert-files/login?next=/ops/referrals");
  }
  return <ReferralOpsPanel />;
}
