import { NextRequest, NextResponse } from "next/server";

import {
  INVITATION_GENERATION_BATCH_LIST_LIMIT,
  listInvitationGenerationBatches,
} from "@/lib/invitations/generation";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const auth = await requireOpsExpertFilesSession(_request);
  if (auth.error) {
    return auth.error;
  }

  const batches = await listInvitationGenerationBatches(
    INVITATION_GENERATION_BATCH_LIST_LIMIT,
  );

  return NextResponse.json({ batches });
}
