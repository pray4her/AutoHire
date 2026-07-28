import {
  confirmIntro,
  createOrRestoreApplication,
} from "@/lib/application/service";
import {
  generateInvitePlaintextToken,
  hashInviteToken,
} from "@/lib/auth/token";
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
 * applications are never backfilled or rewritten. A referral-attributed
 * application starts at INTRO_VIEWED: the introduction was already presented
 * and confirmed on the referral landing, so registration continues straight
 * to the CV upload page.
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
    const created = await createShadowInvitationWithApplication({
      expertId: buildAccountTrackExpertId(input.userId),
      email: input.email,
      tokenHash: hashInviteToken(generateInvitePlaintextToken()),
      referralTokenId,
    });
    if (!referralTokenId) {
      return created;
    }
    // The referral landing already presented the program introduction and the
    // applicant confirmed it via "Continue to CV Submission", so a referral-
    // attributed registration starts past the intro step and lands directly
    // on the CV upload page instead of bouncing through /apply again.
    const confirmed = await confirmIntro(created.application.id);
    return {
      invitation: created.invitation,
      application: confirmed ?? created.application,
    };
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
