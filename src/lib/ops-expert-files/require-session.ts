import type { NextRequest } from "next/server";

import { jsonError } from "@/lib/http";
import { verifyOpsExpertFilesSession } from "@/lib/ops-expert-files/account-auth";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";

export async function requireOpsExpertFilesSession(request: NextRequest) {
  const session = await verifyOpsExpertFilesSession(
    request.cookies.get(getOpsExpertFilesCookieName())?.value,
  );

  if (!session) {
    return {
      session: null,
      error: jsonError("需要有效的运营后台登录会话。", 401, {
        code: "OPS_EXPERT_FILES_SESSION_REQUIRED",
      }),
    } as const;
  }

  return { session, error: null } as const;
}
