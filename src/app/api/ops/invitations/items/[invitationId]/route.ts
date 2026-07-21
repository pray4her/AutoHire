import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, parseJsonBody } from "@/lib/http";
import { setInvitationItemDistributed } from "@/lib/invitations/generation";
import { requireOpsExpertFilesSession } from "@/lib/ops-expert-files/require-session";

export const dynamic = "force-dynamic";

const patchDistributedSchema = z.object({
  distributed: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const auth = await requireOpsExpertFilesSession(request);
  if (auth.error) {
    return auth.error;
  }

  const { invitationId } = await params;
  const body = await parseJsonBody<unknown>(request);
  const parsed = patchDistributedSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      "The invitation distribution update payload is invalid.",
      400,
      {
        code: "INVITATION_DISTRIBUTION_INVALID_PAYLOAD",
        details: parsed.error.flatten(),
      },
    );
  }

  const item = await setInvitationItemDistributed(
    invitationId,
    parsed.data.distributed,
  );

  if (!item) {
    return jsonError("The invitation generation item was not found.", 404, {
      code: "INVITATION_GENERATION_ITEM_NOT_FOUND",
    });
  }

  return NextResponse.json({ item });
}
