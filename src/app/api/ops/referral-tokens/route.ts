import type { NextRequest } from "next/server";

import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";
import { listReferralTokensWithFunnels } from "@/lib/referral-tokens/service";

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) return auth.error;
  return Response.json({
    items: await listReferralTokensWithFunnels(auth.session.operatorDigest),
  });
}
