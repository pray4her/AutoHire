import { NextRequest, NextResponse } from "next/server";

import {
  getAuditDashboardCookieName,
  verifyAuditDashboardCookie,
} from "@/lib/audit/auth";
import { jsonError } from "@/lib/http";
import {
  OpsExportError,
  getExpertFileExportJob,
} from "@/lib/ops-expert-files/export-service";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

function isAuthorized(request: NextRequest) {
  return verifyAuditDashboardCookie(
    request.cookies.get(getAuditDashboardCookieName())?.value,
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthorized(request)) {
    return jsonError("需要有效的运营后台登录会话。", 401, {
      code: "OPS_SESSION_REQUIRED",
    });
  }

  const { jobId } = await context.params;

  try {
    const job = await getExpertFileExportJob(jobId);
    if (!job) {
      return jsonError("未找到导出任务。", 404, {
        code: "OPS_EXPORT_NOT_FOUND",
      });
    }
    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof OpsExportError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
