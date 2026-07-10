import { NextRequest, NextResponse } from "next/server";

import {
  getAuditDashboardCookieName,
  verifyAuditDashboardCookie,
} from "@/lib/audit/auth";
import { jsonError } from "@/lib/http";
import { listExpertFiles } from "@/lib/ops-expert-files/query";
import { expertFilesListQuerySchema } from "@/lib/ops-expert-files/schemas";

function isAuthorized(request: NextRequest) {
  return verifyAuditDashboardCookie(
    request.cookies.get(getAuditDashboardCookieName())?.value,
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonError("A valid operations session is required.", 401, {
      code: "OPS_SESSION_REQUIRED",
    });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = expertFilesListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return jsonError("Invalid expert files query.", 400, {
      code: "OPS_EXPERT_FILES_INVALID_QUERY",
      details: parsed.error.flatten(),
    });
  }

  const result = await listExpertFiles(parsed.data);
  return NextResponse.json(result);
}
