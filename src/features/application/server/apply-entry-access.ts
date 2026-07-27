import type { ApplicationSnapshot } from "@/features/application/types";
import { ensureAccountApplication } from "@/lib/account-auth/shadow-invitation";
import {
  createOrRestoreApplication,
  createSessionForApplication,
  getSnapshot,
  resolveInviteToken,
} from "@/lib/application/service";
import { getInvitationAccessBlockReason } from "@/lib/auth/invitation-access";
import { verifySessionToken } from "@/lib/auth/session";
import { findInvitationById } from "@/lib/data/store";

export type ApplyEntryAccessErrorCode =
  | "APPLICATION_NOT_FOUND"
  | "DISABLED_TOKEN"
  | "EXPIRED_TOKEN"
  | "INVALID_TOKEN"
  | "SESSION_INIT_FAILED"
  | "SESSION_REQUIRED";

type ApplyEntryAccessGranted = {
  readonly kind: "granted";
  readonly snapshot: ApplicationSnapshot;
  readonly sessionToken: string | null;
  readonly source: "session_cookie" | "token" | "account";
};

type ApplyEntryAccessRejected = {
  readonly kind: "rejected";
  readonly code: ApplyEntryAccessErrorCode;
  readonly message: string;
  readonly status: number;
};

export type ApplyEntryAccessResult =
  | ApplyEntryAccessGranted
  | ApplyEntryAccessRejected;

export async function resolveApplyEntryAccessFromToken(
  token: string,
): Promise<ApplyEntryAccessResult> {
  const invitation = await resolveInviteToken(token);

  // Shadow invitations belong to the account track: their token plaintext is
  // never exposed, and any token resolving to one must not log in via link.
  if (!invitation || invitation.source === "ACCOUNT") {
    return {
      kind: "rejected",
      code: "INVALID_TOKEN",
      message: "The invitation link is invalid.",
      status: 401,
    };
  }

  if (invitation.tokenStatus === "DISABLED") {
    return {
      kind: "rejected",
      code: "DISABLED_TOKEN",
      message: "This invitation link has been disabled.",
      status: 403,
    };
  }

  if (invitation.expiredAt && invitation.expiredAt.getTime() < Date.now()) {
    return {
      kind: "rejected",
      code: "EXPIRED_TOKEN",
      message: "This invitation link has expired.",
      status: 410,
    };
  }

  const application = await createOrRestoreApplication({
    id: invitation.id,
    expertId: invitation.expertId,
  });
  const snapshot = await getSnapshot(application.id);
  const sessionToken = await createSessionForApplication(application.id);

  if (!snapshot || !sessionToken) {
    return {
      kind: "rejected",
      code: "SESSION_INIT_FAILED",
      message: "Unable to initialize the application session.",
      status: 500,
    };
  }

  return {
    kind: "granted",
    snapshot,
    sessionToken,
    source: "token",
  };
}

export async function resolveApplyEntryAccessFromSessionCookie(
  cookieValue: string | null | undefined,
): Promise<ApplyEntryAccessResult> {
  const session = verifySessionToken(cookieValue);

  if (!session) {
    return {
      kind: "rejected",
      code: "SESSION_REQUIRED",
      message: "No valid session was found. Please reopen the invitation link.",
      status: 401,
    };
  }

  const invitation = await findInvitationById(session.invitationId);
  const invitationBlockReason = getInvitationAccessBlockReason(invitation);

  if (invitationBlockReason === "DISABLED") {
    return {
      kind: "rejected",
      code: "DISABLED_TOKEN",
      message: "This invitation link has been disabled.",
      status: 403,
    };
  }

  if (invitationBlockReason === "EXPIRED") {
    return {
      kind: "rejected",
      code: "EXPIRED_TOKEN",
      message: "This invitation link has expired.",
      status: 410,
    };
  }

  if (invitationBlockReason === "NOT_FOUND") {
    return {
      kind: "rejected",
      code: "SESSION_REQUIRED",
      message: "No valid session was found. Please reopen the invitation link.",
      status: 401,
    };
  }

  const snapshot = await getSnapshot(session.applicationId);

  if (!snapshot) {
    return {
      kind: "rejected",
      code: "APPLICATION_NOT_FOUND",
      message: "The application record could not be found.",
      status: 404,
    };
  }

  return {
    kind: "granted",
    snapshot,
    sessionToken: null,
    source: "session_cookie",
  };
}

export type AccountSessionIdentity = {
  readonly userId: string;
  readonly email: string;
};

/**
 * Account-track entry: resolves the Better Auth account to its shadow
 * invitation's application (creating it lazily when the registration hook
 * did not run) and issues the same application session the link track uses,
 * so the whole downstream flow converges on the shared application data.
 */
export async function resolveApplyEntryAccessFromAccountSession(
  identity: AccountSessionIdentity,
): Promise<ApplyEntryAccessResult> {
  const { application } = await ensureAccountApplication({
    userId: identity.userId,
    email: identity.email,
  });
  const snapshot = await getSnapshot(application.id);
  const sessionToken = await createSessionForApplication(application.id);

  if (!snapshot || !sessionToken) {
    return {
      kind: "rejected",
      code: "SESSION_INIT_FAILED",
      message: "Unable to initialize the application session.",
      status: 500,
    };
  }

  return {
    kind: "granted",
    snapshot,
    sessionToken,
    source: "account",
  };
}
