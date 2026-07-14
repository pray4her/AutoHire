import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ExpertFilesLoginForm } from "@/features/ops-expert-files/components/expert-files-login-form";
import { verifyOpsExpertFilesSession } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";

export default async function ExpertFilesLoginPage() {
  await connection();

  const cookieStore = await cookies();
  const session = await verifyOpsExpertFilesSession(
    cookieStore.get(getOpsExpertFilesCookieName())?.value,
  );

  if (session) {
    redirect("/ops/expert-files");
  }

  return <ExpertFilesLoginForm />;
}
