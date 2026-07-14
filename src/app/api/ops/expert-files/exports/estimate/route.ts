import { NextRequest, NextResponse } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsExportError,
  estimateExpertFileExport,
} from "@/lib/ops-expert-files/export-service";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";
import { exportEstimateRequestSchema } from "@/lib/ops-expert-files/schemas";

export async function POST(request: NextRequest) {
  const { error } = await requireOpsExpertFilesSession(request);
  if (error) {
    return error;
  }

  const body = await parseJsonBody<unknown>(request);
  const parsed = exportEstimateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("导出预估请求参数无效。", 400, {
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
