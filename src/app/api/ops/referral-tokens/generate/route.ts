import type { NextRequest } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import { requireOpsReferralSession } from "@/lib/ops-referral-auth/require-session";
import { referralTokenBatchGenerateSchema } from "@/lib/referral-tokens/schemas";
import { batchGenerateReferralTokens } from "@/lib/referral-tokens/service";

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireOpsReferralSession(request);
  if (auth.error) return auth.error;
  const parsed = referralTokenBatchGenerateSchema.safeParse(
    await parseJsonBody<unknown>(request),
  );
  if (!parsed.success) {
    return jsonError("推荐链接生成参数无效。", 400, {
      code: "REFERRAL_TOKEN_INVALID_PAYLOAD",
      details: parsed.error.flatten(),
    });
  }
  return Response.json(
    await batchGenerateReferralTokens({
      entries: parsed.data.entries,
      createdBy: auth.session.operatorDigest,
    }),
    { status: 201 },
  );
}
