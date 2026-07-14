import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import {
  OpsExportError,
  createExpertFileExportDownloadUrl,
} from "@/lib/ops-expert-files/export-service";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { error } = await requireOpsExpertFilesSession(request);
  if (error) {
    return error;
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
