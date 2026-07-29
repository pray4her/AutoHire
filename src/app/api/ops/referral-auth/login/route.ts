import { NextRequest, NextResponse } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsReferralAuthError,
  loginOpsReferral,
} from "@/lib/ops-referral-auth/account-auth";
import { opsReferralLoginSchema } from "@/lib/ops-referral-auth/auth-schemas";
import { setOpsReferralSessionCookie } from "@/lib/ops-referral-auth/cookie";

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<unknown>(request);
  const parsed = opsReferralLoginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("登录参数无效。", 400, {
      code: "OPS_REFERRAL_INVALID_LOGIN",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await loginOpsReferral(parsed.data);
    const response = NextResponse.json({
      ok: true,
      username: result.username,
    });
    setOpsReferralSessionCookie(response, request, result.cookieValue);
    return response;
  } catch (error) {
    if (error instanceof OpsReferralAuthError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
