import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ExpertFilesPanel } from "@/features/ops-expert-files/components/expert-files-panel";
import { ReferralTokenConsole } from "@/features/referral-tokens/components/referral-token-console";
import { verifyOpsExpertFilesSession } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";
import { listReferralExpertOptions } from "@/lib/referral-tokens/expert-search";

export default async function ExpertFilesPage() {
  await connection();

  const cookieStore = await cookies();
  const session = await verifyOpsExpertFilesSession(
    cookieStore.get(getOpsExpertFilesCookieName())?.value,
  );

  if (!session) {
    redirect("/ops/expert-files/login");
  }

  const experts = await listReferralExpertOptions("");

  return (
    <main>
      <ExpertFilesPanel />
      <section
        aria-label="推荐链接管理"
        className="mx-auto w-full max-w-7xl px-4 pb-8 md:px-8"
      >
        <ReferralTokenConsole initialExperts={experts} />
      </section>
    </main>
  );
}
