import { NextRequest, NextResponse } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsReferralAuthError,
  changeOpsReferralPassword,
} from "@/lib/ops-referral-auth/account-auth";
import { opsReferralChangePasswordSchema } from "@/lib/ops-referral-auth/auth-schemas";
import { setOpsReferralSessionCookie } from "@/lib/ops-referral-auth/cookie";
import { getOpsReferralCookieName } from "@/lib/ops-referral-auth/session";

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<unknown>(request);
  const parsed = opsReferralChangePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("修改密码参数无效。", 400, {
      code: "OPS_REFERRAL_INVALID_CHANGE_PASSWORD",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await changeOpsReferralPassword({
      cookieValue: request.cookies.get(getOpsReferralCookieName())?.value,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
    const response = NextResponse.json({ ok: true });
    setOpsReferralSessionCookie(response, request, result.cookieValue);
    return response;
  } catch (error) {
    if (error instanceof OpsReferralAuthError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
