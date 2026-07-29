import type { NextRequest } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import { requireOpsReferralSession } from "@/lib/ops-referral-auth/require-session";
import { referralTokenActionSchema } from "@/lib/referral-tokens/schemas";
import {
  disableReferralToken,
  ReferralTokenUnavailableError,
  regenerateReferralToken,
  renewReferralToken,
} from "@/lib/referral-tokens/service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> },
): Promise<Response> {
  const auth = await requireOpsReferralSession(request);
  if (auth.error) return auth.error;
  const parsed = referralTokenActionSchema.safeParse(
    await parseJsonBody<unknown>(request),
  );
  if (!parsed.success) {
    return jsonError("推荐 token 操作参数无效。", 400, {
      code: "REFERRAL_TOKEN_INVALID_ACTION",
      details: parsed.error.flatten(),
    });
  }
  const { tokenId } = await context.params;
  const createdBy = auth.session.operatorDigest;
  try {
    switch (parsed.data.action) {
      case "DISABLE":
        return Response.json({
          token: await disableReferralToken({ tokenId, createdBy }),
        });
      case "RENEW":
        return Response.json({
          token: await renewReferralToken({ tokenId, createdBy }),
        });
      case "REGENERATE":
        return Response.json(
          await regenerateReferralToken({ tokenId, createdBy }),
        );
    }
  } catch (error) {
    if (error instanceof ReferralTokenUnavailableError) {
      return jsonError(error.message, 404, {
        code: "REFERRAL_TOKEN_UNAVAILABLE",
      });
    }
    throw error;
  }
}
