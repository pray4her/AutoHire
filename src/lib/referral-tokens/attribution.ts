import { getRuntimeMode } from "@/lib/env";
import { findReferralTokenByHash } from "@/lib/referral-tokens/public-repository";
import { hashReferralToken } from "@/lib/referral-tokens/token";
import { toReferralProgressStage } from "@/lib/referral-tokens/progress-stage";

export type ReferralTokenFunnel = {
  readonly clickCount: number;
  readonly registrationCount: number;
  readonly applicationCount: number;
};

/**
 * Resolves a plaintext referral token to an ACTIVE, unexpired token id.
 * Invalid, disabled, expired, or unknown tokens resolve to null — callers
 * must treat that as "no attribution", never as an error.
 */
export async function resolveActiveReferralTokenId(
  plaintextToken: string | null | undefined,
): Promise<string | null> {
  if (!plaintextToken || !/^[0-9a-f]{64}$/i.test(plaintextToken)) {
    return null;
  }

  const record = await findReferralTokenByHash(hashReferralToken(plaintextToken));
  if (!record) {
    return null;
  }
  if (record.status !== "ACTIVE") {
    return null;
  }
  if (record.expiredAt.getTime() <= Date.now()) {
    return null;
  }
  return record.id;
}

/**
 * Click → registration → application funnel for one referral token.
 * Account-track registration creates the application in the same step, so
 * registrationCount and applicationCount are equal for attributed apps.
 */
export async function getReferralTokenFunnel(
  referralTokenId: string,
): Promise<ReferralTokenFunnel> {
  if (getRuntimeMode() === "memory") {
    const clickCount =
      globalThis.__autohireReferralClickLogStore?.logs.filter(
        (log) => log.referralTokenId === referralTokenId,
      ).length ?? 0;
    const applicationCount =
      (
        globalThis as typeof globalThis & {
          __autohireStore?: {
            applications: Array<{ referralTokenId: string | null }>;
          };
        }
      ).__autohireStore?.applications.filter(
        (app) => app.referralTokenId === referralTokenId,
      ).length ?? 0;

    return {
      clickCount,
      registrationCount: applicationCount,
      applicationCount,
    };
  }

  const { prisma } = await import("@/lib/db/prisma");
  const [clickCount, applicationCount] = await Promise.all([
    prisma.referralTokenClickLog.count({ where: { referralTokenId } }),
    prisma.application.count({ where: { referralTokenId } }),
  ]);

  return {
    clickCount,
    registrationCount: applicationCount,
    applicationCount,
  };
}

export async function listReferralDownstream(referralTokenId: string) {
  if (getRuntimeMode() === "memory") {
    const store = (
      globalThis as typeof globalThis & {
        __autohireStore?: {
          applications: Array<{
            id: string;
            invitationId: string;
            screeningContactEmail: string | null;
            screeningWorkEmail: string | null;
            applicationStatus: string;
            referralTokenId: string | null;
          }>;
          invitations: Array<{ id: string; email: string | null }>;
        };
      }
    ).__autohireStore;
    const apps = store?.applications ?? [];
    const invitations = store?.invitations ?? [];
    return apps
      .filter((app) => app.referralTokenId === referralTokenId)
      .map((app) => ({
        applicationId: app.id,
        email:
          app.screeningContactEmail ??
          app.screeningWorkEmail ??
          invitations.find((item) => item.id === app.invitationId)?.email ??
          null,
        progressStage: toReferralProgressStage(app.applicationStatus),
      }));
  }
  const { prisma } = await import("@/lib/db/prisma");
  const applications = await prisma.application.findMany({
    where: { referralTokenId },
    select: {
      id: true,
      screeningContactEmail: true,
      screeningWorkEmail: true,
      applicationStatus: true,
      invitation: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return applications.map((app) => ({
    applicationId: app.id,
    email:
      app.screeningContactEmail ??
      app.screeningWorkEmail ??
      app.invitation.email,
    progressStage: toReferralProgressStage(app.applicationStatus),
  }));
}
