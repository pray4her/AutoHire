import { createOrRestoreApplication } from "@/lib/application/service";
import { generateInvitePlaintextToken, hashInviteToken } from "@/lib/auth/token";
import {
  createShadowInvitationWithApplication,
  findShadowInvitationByEmail,
} from "@/lib/data/store";
import { resolveActiveReferralTokenId } from "@/lib/referral-tokens/attribution";

export function buildAccountTrackExpertId(userId: string) {
  return `account_${userId}`;
}

/**
 * Ensures the account-track application context exists for a registered
 * account: a shadow invitation (email bound to the registered email, random
 * token hash whose plaintext is discarded, never usable for link login) plus
 * the application attached to it. Idempotent — safe to call from the
 * registration hook and from the account-track apply-entry resolution.
 *
 * Optional referralPlaintextToken establishes Referral Attribution only when
 * creating a new application and the token is ACTIVE + unexpired. Existing
 * applications are never backfilled or rewritten.
 */
export async function ensureAccountApplication(input: {
  userId: string;
  email: string;
  referralPlaintextToken?: string | null;
}) {
  const referralTokenId = await resolveActiveReferralTokenId(
    input.referralPlaintextToken,
  );
  const existing = await findShadowInvitationByEmail(input.email);

  if (existing) {
    const application = await createOrRestoreApplication({
      id: existing.id,
      expertId: existing.expertId,
    });

    return { invitation: existing, application };
  }

  try {
    return await createShadowInvitationWithApplication({
      expertId: buildAccountTrackExpertId(input.userId),
      email: input.email,
      tokenHash: hashInviteToken(generateInvitePlaintextToken()),
      referralTokenId,
    });
  } catch (error) {
    // A concurrent registration for the same email may have won the race on
    // the shadow-email unique index; fall back to the existing records.
    const winner = await findShadowInvitationByEmail(input.email);

    if (!winner) {
      throw error;
    }

    const application = await createOrRestoreApplication({
      id: winner.id,
      expertId: winner.expertId,
    });

    return { invitation: winner, application };
  }
}
