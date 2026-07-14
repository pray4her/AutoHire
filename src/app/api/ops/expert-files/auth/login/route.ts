import { NextRequest, NextResponse } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsExpertFilesAuthError,
  loginOpsExpertFiles,
} from "@/lib/ops-expert-files/account-auth";
import { opsExpertFilesLoginSchema } from "@/lib/ops-expert-files/auth-schemas";
import { setOpsExpertFilesSessionCookie } from "@/lib/ops-expert-files/cookie";

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<unknown>(request);
  const parsed = opsExpertFilesLoginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("登录参数无效。", 400, {
      code: "OPS_EXPERT_FILES_INVALID_LOGIN",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await loginOpsExpertFiles(parsed.data);
    const response = NextResponse.json({
      ok: true,
      username: result.username,
    });
    setOpsExpertFilesSessionCookie(response, request, result.cookieValue);
    return response;
  } catch (error) {
    if (error instanceof OpsExpertFilesAuthError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
