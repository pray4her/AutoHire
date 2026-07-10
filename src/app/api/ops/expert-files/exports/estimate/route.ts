import { NextRequest, NextResponse } from "next/server";

import {
  getAuditDashboardCookieName,
  verifyAuditDashboardCookie,
} from "@/lib/audit/auth";
import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsExportError,
  estimateExpertFileExport,
} from "@/lib/ops-expert-files/export-service";
import { exportEstimateRequestSchema } from "@/lib/ops-expert-files/schemas";

function isAuthorized(request: NextRequest) {
  return verifyAuditDashboardCookie(
    request.cookies.get(getAuditDashboardCookieName())?.value,
  );
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonError("A valid operations session is required.", 401, {
      code: "OPS_SESSION_REQUIRED",
    });
  }

  const body = await parseJsonBody<unknown>(request);
  const parsed = exportEstimateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid export estimate payload.", 400, {
      code: "OPS_EXPORT_INVALID_PAYLOAD",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await estimateExpertFileExport(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OpsExportError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
