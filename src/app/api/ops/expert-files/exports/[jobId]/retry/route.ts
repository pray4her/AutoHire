import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import {
  OpsExportError,
  retryExpertFileExport,
} from "@/lib/ops-expert-files/export-service";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { session, error } = await requireOpsExpertFilesSession(request);
  if (error || !session) {
    return error;
  }

  const { jobId } = await context.params;

  try {
    const job = await retryExpertFileExport({
      jobId,
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
