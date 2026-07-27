import { z } from "zod";

import { jsonError } from "@/lib/http";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";
import { listReferralExpertOptions } from "@/lib/referral-tokens/expert-search";

const referralExpertQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
});

export async function GET(request: Request): Promise<Response> {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) {
    return auth.error;
  }

  const parsed = referralExpertQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!parsed.success) {
    return jsonError("专家搜索参数无效。", 400, {
      code: "REFERRAL_EXPERT_INVALID_QUERY",
      details: parsed.error.flatten(),
    });
  }

  return Response.json({
    items: await listReferralExpertOptions(parsed.data.q),
  });
}
