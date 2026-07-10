import { NextRequest, NextResponse } from "next/server";

import {
  getAuditDashboardCookieName,
  verifyAuditDashboardCookie,
} from "@/lib/audit/auth";
import { jsonError } from "@/lib/http";
import {
  OpsExportError,
  createExpertFileExportDownloadUrl,
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
    return jsonError("A valid operations session is required.", 401, {
      code: "OPS_SESSION_REQUIRED",
    });
  }

  const { jobId } = await context.params;

  try {
    const result = await createExpertFileExportDownloadUrl(jobId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OpsExportError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
