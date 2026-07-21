import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import {
  getInvitationGenerationBatchSummary,
  INVITATION_GENERATION_PREVIEW_LIMIT,
} from "@/lib/invitations/generation";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

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
  const batch = await getInvitationGenerationBatchSummary(batchId, {
    itemLimit: INVITATION_GENERATION_PREVIEW_LIMIT,
  });

  if (!batch) {
    return jsonError("The invitation generation batch was not found.", 404, {
      code: "INVITATION_GENERATION_BATCH_NOT_FOUND",
    });
  }

  return NextResponse.json({ batch });
}
