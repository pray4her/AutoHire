import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { InvitationGeneratorPanel } from "@/features/invitations/components/invitation-generator-panel";
import { verifyOpsExpertFilesSession } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";

export default async function InvitationsPage() {
  await connection();

  const cookieStore = await cookies();
  const session = await verifyOpsExpertFilesSession(
    cookieStore.get(getOpsExpertFilesCookieName())?.value,
  );

  if (!session) {
    redirect("/ops/invitations/login");
  }

  return <InvitationGeneratorPanel />;
}
