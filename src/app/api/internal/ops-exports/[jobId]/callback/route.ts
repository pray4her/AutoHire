import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { jsonError, parseJsonBody } from "@/lib/http";
import {
  OpsExportError,
  handleExpertFileExportCallback,
} from "@/lib/ops-expert-files/export-service";
import { exportCallbackSchema } from "@/lib/ops-expert-files/schemas";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

function authorizeCallback(request: NextRequest) {
  const secret = getEnv().OPS_EXPORT_CALLBACK_SECRET;
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1]) {
    return false;
  }

  const left = Buffer.from(match[1]);
  const right = Buffer.from(secret);
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!authorizeCallback(request)) {
    return jsonError("Unauthorized callback.", 401, {
      code: "OPS_EXPORT_CALLBACK_UNAUTHORIZED",
    });
  }

  const { jobId } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  const parsed = exportCallbackSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid callback payload.", 400, {
      code: "OPS_EXPORT_CALLBACK_INVALID",
      details: parsed.error.flatten(),
    });
  }

  try {
    const job = await handleExpertFileExportCallback({
      jobId,
      ...parsed.data,
    });
    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof OpsExportError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
