import { NextRequest, NextResponse } from "next/server";

import {
  getAuditDashboardCookieName,
  getAuditDashboardOperatorDigest,
  verifyAuditDashboardCookie,
} from "@/lib/audit/auth";
import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsExportError,
  createExpertFileExport,
  listExpertFileExportJobs,
} from "@/lib/ops-expert-files/export-service";
import { exportCreateRequestSchema } from "@/lib/ops-expert-files/schemas";

function isAuthorized(request: NextRequest) {
  return verifyAuditDashboardCookie(
    request.cookies.get(getAuditDashboardCookieName())?.value,
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonError("需要有效的运营后台登录会话。", 401, {
      code: "OPS_SESSION_REQUIRED",
    });
  }

  const jobs = await listExpertFileExportJobs();
  return NextResponse.json({ items: jobs });
}

export async function POST(request: NextRequest) {
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

  const body = await parseJsonBody<unknown>(request);
  const parsed = exportCreateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("导出创建请求参数无效。", 400, {
      code: "OPS_EXPORT_INVALID_PAYLOAD",
      details: parsed.error.flatten(),
    });
  }

  try {
    const job = await createExpertFileExport({
      ...parsed.data,
      operatorDigest,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof OpsExportError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
