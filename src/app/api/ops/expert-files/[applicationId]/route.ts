import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import { getExpertFileDetail } from "@/lib/ops-expert-files/inventory-loader";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

type RouteContext = {
  params: Promise<{ applicationId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { error } = await requireOpsExpertFilesSession(request);
  if (error) {
    return error;
  }

  const { applicationId } = await context.params;
  const detail = await getExpertFileDetail(applicationId);

  if (!detail) {
    return jsonError("未找到该专家申请。", 404, {
      code: "OPS_EXPERT_FILE_NOT_FOUND",
    });
  }

  return NextResponse.json(detail);
}
