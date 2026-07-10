import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ExpertFilesPanel } from "@/features/ops-expert-files/components/expert-files-panel";
import {
  getAuditDashboardCookieName,
  verifyAuditDashboardCookie,
} from "@/lib/audit/auth";

export default async function ExpertFilesPage() {
  await connection();

  const cookieStore = await cookies();
  const isAuthorized = verifyAuditDashboardCookie(
    cookieStore.get(getAuditDashboardCookieName())?.value,
  );

  if (!isAuthorized) {
    notFound();
  }

  return <ExpertFilesPanel />;
}
