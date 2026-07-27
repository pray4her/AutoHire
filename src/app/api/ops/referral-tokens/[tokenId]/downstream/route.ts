import type { NextRequest } from "next/server";

import { jsonError } from "@/lib/http";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";
import {
  listReferralDownstreamForOwner,
  ReferralTokenUnavailableError,
} from "@/lib/referral-tokens/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> },
): Promise<Response> {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) return auth.error;
  const { tokenId } = await context.params;
  try {
    return Response.json({
      items: await listReferralDownstreamForOwner({
        tokenId,
        createdBy: auth.session.operatorDigest,
      }),
    });
  } catch (error) {
    if (error instanceof ReferralTokenUnavailableError) {
      return jsonError(error.message, 404, {
        code: "REFERRAL_TOKEN_UNAVAILABLE",
      });
    }
    throw error;
  }
}
