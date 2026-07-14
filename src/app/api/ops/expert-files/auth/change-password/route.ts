import { NextRequest, NextResponse } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsExpertFilesAuthError,
  changeOpsExpertFilesPassword,
} from "@/lib/ops-expert-files/account-auth";
import { opsExpertFilesChangePasswordSchema } from "@/lib/ops-expert-files/auth-schemas";
import { setOpsExpertFilesSessionCookie } from "@/lib/ops-expert-files/cookie";
import { getOpsExpertFilesCookieName } from "@/lib/ops-expert-files/session";

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<unknown>(request);
  const parsed = opsExpertFilesChangePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("修改密码参数无效。", 400, {
      code: "OPS_EXPERT_FILES_INVALID_CHANGE_PASSWORD",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await changeOpsExpertFilesPassword({
      cookieValue: request.cookies.get(getOpsExpertFilesCookieName())?.value,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
    const response = NextResponse.json({ ok: true });
    setOpsExpertFilesSessionCookie(response, request, result.cookieValue);
    return response;
  } catch (error) {
    if (error instanceof OpsExpertFilesAuthError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
