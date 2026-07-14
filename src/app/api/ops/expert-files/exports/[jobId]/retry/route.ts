import { NextRequest, NextResponse } from "next/server";

import {
  getAuditDashboardCookieName,
  getAuditDashboardOperatorDigest,
  verifyAuditDashboardCookie,
} from "@/lib/audit/auth";
import { jsonError } from "@/lib/http";
import {
  OpsExportError,
  retryExpertFileExport,
} from "@/lib/ops-expert-files/export-service";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

function isAuthorized(request: NextRequest) {
  return verifyAuditDashboardCookie(
    request.cookies.get(getAuditDashboardCookieName())?.value,
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthorized(request)) {
    return jsonError("需要有效的运营后台登录会话。", 401, {
      code: "OPS_SESSION_REQUIRED",
    });
  }

  const operatorDigest = getAuditDashboardOperatorDigest(
    request.cookies.get(getAuditDashboardCookieName())?.value,
  );

  if (!operatorDigest) {
    return jsonError("需要有效的运营后台登录会话。", 401, {
      code: "OPS_SESSION_REQUIRED",
    });
  }

  const { jobId } = await context.params;

  try {
    const job = await retryExpertFileExport({ jobId, operatorDigest });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof OpsExportError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
