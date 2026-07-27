import type { NextRequest } from "next/server";

import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";
import { listReferralDownstream } from "@/lib/referral-tokens/attribution";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> },
): Promise<Response> {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) return auth.error;
  const { tokenId } = await context.params;
  return Response.json({ items: await listReferralDownstream(tokenId) });
}
