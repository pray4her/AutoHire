import { NextResponse } from "next/server";

import { clearRecordedEmails } from "@/lib/email/transport";

/**
 * Resets in-memory application/referral/ops stores for local e2e.
 * Better Auth rows live in Postgres — use `/api/test/cleanup-account`
 * for per-email account-track cleanup.
 */
function resetDevMemoryStores() {
  const globals = globalThis as typeof globalThis & {
    __autohireStore?: unknown;
    __autohireReferralTokenStore?: unknown;
    __autohireReferralClickLogStore?: unknown;
    __autohireOpsExpertFilesAccounts?: unknown;
    __autohireOpsReferralAccounts?: unknown;
    __autohireCustomerNoCounters?: unknown;
  };

  globals.__autohireStore = undefined;
  globals.__autohireReferralTokenStore = undefined;
  globals.__autohireReferralClickLogStore = undefined;
  globals.__autohireOpsExpertFilesAccounts = undefined;
  globals.__autohireOpsReferralAccounts = undefined;
  globals.__autohireCustomerNoCounters = undefined;
  clearRecordedEmails();
}

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  resetDevMemoryStores();

  return NextResponse.json({ ok: true });
}
