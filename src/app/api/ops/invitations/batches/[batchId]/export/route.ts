import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import {
  buildInvitationGenerationWorkbook,
  getInvitationGenerationBatchSummary,
} from "@/lib/invitations/generation";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

export const maxDuration = 800;
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) {
    return auth.error;
  }

  const { batchId } = await params;
  const batch = await getInvitationGenerationBatchSummary(batchId);

  if (!batch) {
    return jsonError("The invitation generation batch was not found.", 404, {
      code: "INVITATION_GENERATION_BATCH_NOT_FOUND",
    });
  }

  const workbook = buildInvitationGenerationWorkbook(batch);
  const filename = `邀请令牌-${batch.id}.xlsx`;
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${batch.id}.xlsx"; filename*=UTF-8''${encodedFilename}`,
      "cache-control": "no-store",
    },
  });
}
