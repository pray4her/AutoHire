import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import { listExpertFiles } from "@/lib/ops-expert-files/query";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";
import { expertFilesListQuerySchema } from "@/lib/ops-expert-files/schemas";

export async function GET(request: NextRequest) {
  const { error } = await requireOpsExpertFilesSession(request);
  if (error) {
    return error;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = expertFilesListQuerySchema.safeParse(params);

  if (!parsed.success) {
    return jsonError("专家档案查询参数无效。", 400, {
      code: "OPS_EXPERT_FILES_INVALID_QUERY",
      details: parsed.error.flatten(),
    });
  }

  const result = await listExpertFiles(parsed.data);
  return NextResponse.json(result);
}
