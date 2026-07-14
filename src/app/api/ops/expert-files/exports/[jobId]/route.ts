import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import {
  OpsExportError,
  getExpertFileExportJob,
} from "@/lib/ops-expert-files/export-service";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { error } = await requireOpsExpertFilesSession(request);
  if (error) {
    return error;
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
