import { NextRequest, NextResponse } from "next/server";

import {
  getAuditDashboardCookieName,
  verifyAuditDashboardCookie,
} from "@/lib/audit/auth";
import { jsonError } from "@/lib/http";
import { getExpertFileDetail } from "@/lib/ops-expert-files/inventory-loader";

type RouteContext = {
  params: Promise<{ applicationId: string }>;
};

function isAuthorized(request: NextRequest) {
  return verifyAuditDashboardCookie(
    request.cookies.get(getAuditDashboardCookieName())?.value,
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthorized(request)) {
    return jsonError("A valid operations session is required.", 401, {
      code: "OPS_SESSION_REQUIRED",
    });
  }

  const { applicationId } = await context.params;
  const detail = await getExpertFileDetail(applicationId);

  if (!detail) {
    return jsonError("Expert application not found.", 404, {
      code: "OPS_EXPERT_FILE_NOT_FOUND",
    });
  }

  return NextResponse.json(detail);
}
