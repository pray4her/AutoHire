import type { NextRequest } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";
import {
  referralTokenActionSchema,
  referralTokenCreateSchema,
} from "@/lib/referral-tokens/schemas";
import {
  ActiveReferralTokenExistsError,
  disableReferralToken,
  generateReferralToken,
  getReferralToken,
  ReferralTokenNotFoundError,
  ReferralTokenUnavailableError,
  regenerateReferralToken,
  renewReferralToken,
} from "@/lib/referral-tokens/service";

type RouteContext = {
  readonly params: Promise<{ readonly applicationId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) {
    return auth.error;
  }

  const { applicationId } = await context.params;
  return Response.json({ token: await getReferralToken(applicationId) });
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await parseJsonBody<unknown>(request);
  const parsed = referralTokenCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("推荐链接生成参数无效。", 400, {
      code: "REFERRAL_TOKEN_INVALID_PAYLOAD",
      details: parsed.error.flatten(),
    });
  }

  const { applicationId } = await context.params;
  try {
    const result = await generateReferralToken({
      applicationId,
      displayFields: parsed.data.displayFields,
      createdBy: auth.session.operatorDigest,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReferralTokenNotFoundError) {
      return jsonError(error.message, 404, {
        code: "REFERRAL_EXPERT_NOT_FOUND",
      });
    }
    if (error instanceof ActiveReferralTokenExistsError) {
      return jsonError(error.message, 409, {
        code: "REFERRAL_TOKEN_ACTIVE_EXISTS",
      });
    }
    throw error;
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await parseJsonBody<unknown>(request);
  const parsed = referralTokenActionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("推荐 token 操作参数无效。", 400, {
      code: "REFERRAL_TOKEN_INVALID_ACTION",
      details: parsed.error.flatten(),
    });
  }

  const { applicationId } = await context.params;
  try {
    switch (parsed.data.action) {
      case "DISABLE":
        return Response.json({
          token: await disableReferralToken(applicationId),
        });
      case "RENEW":
        return Response.json({
          token: await renewReferralToken(applicationId),
        });
      case "REGENERATE":
        return Response.json(
          await regenerateReferralToken({
            applicationId,
            displayFields: parsed.data.displayFields,
            createdBy: auth.session.operatorDigest,
          }),
        );
      default: {
        const unreachable: never = parsed.data;
        return unreachable;
      }
    }
  } catch (error) {
    if (error instanceof ReferralTokenNotFoundError) {
      return jsonError(error.message, 404, {
        code: "REFERRAL_EXPERT_NOT_FOUND",
      });
    }
    if (error instanceof ReferralTokenUnavailableError) {
      return jsonError(error.message, 409, {
        code: "REFERRAL_TOKEN_UNAVAILABLE",
      });
    }
    throw error;
  }
}
