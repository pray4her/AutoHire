import type { NextRequest } from "next/server";

import { jsonError } from "@/lib/http";
import { verifyOpsReferralSession } from "@/lib/ops-referral-auth/account-auth";
import { getOpsReferralCookieName } from "@/lib/ops-referral-auth/session";

export async function requireOpsReferralSession(request: NextRequest) {
  const session = await verifyOpsReferralSession(
    request.cookies.get(getOpsReferralCookieName())?.value,
  );

  if (!session) {
    return {
      session: null,
      error: jsonError("需要有效的推荐后台登录会话。", 401, {
        code: "OPS_REFERRAL_SESSION_REQUIRED",
      }),
    } as const;
  }

  return { session, error: null } as const;
}
