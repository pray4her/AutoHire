import { NextRequest, NextResponse } from "next/server";

import { jsonError, parseJsonBody } from "@/lib/http";
import {
  generateInvitationBatch,
  InvitationGenerationConflictError,
  invitationGenerationRequestSchema,
} from "@/lib/invitations/generation";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

export const maxDuration = 800;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await parseJsonBody<unknown>(request);
  const parsed = invitationGenerationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      "The invitation generation request payload is invalid.",
      400,
      {
        code: "INVITATION_GENERATION_INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      },
    );
  }

  try {
    const batch = await generateInvitationBatch(parsed.data);

    return NextResponse.json({ batch });
  } catch (error) {
    if (error instanceof InvitationGenerationConflictError) {
      return jsonError(error.message, 409, {
        code: "INVITATION_GENERATION_IDEMPOTENCY_CONFLICT",
      });
    }

    throw error;
  }
}
