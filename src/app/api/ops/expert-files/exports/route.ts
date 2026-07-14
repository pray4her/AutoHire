import { NextRequest, NextResponse } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsExportError,
  createExpertFileExport,
  listExpertFileExportJobs,
} from "@/lib/ops-expert-files/export-service";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";
import { exportCreateRequestSchema } from "@/lib/ops-expert-files/schemas";

export async function GET(request: NextRequest) {
  const { error } = await requireOpsExpertFilesSession(request);
  if (error) {
    return error;
  }

  const jobs = await listExpertFileExportJobs();
  return NextResponse.json({ items: jobs });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireOpsExpertFilesSession(request);
  if (error || !session) {
    return error;
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
      operatorDigest: session.operatorDigest,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof OpsExportError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
