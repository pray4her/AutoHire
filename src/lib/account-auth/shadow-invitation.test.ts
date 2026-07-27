import { beforeEach, describe, expect, it } from "vitest";

import { ensureAccountApplication } from "@/lib/account-auth/shadow-invitation";
import { resolveReportEmailRecipient } from "@/lib/initial-material-review-report-email/resolve-recipient";
import {
  findInvitationById,
  findOpenApplicationByInvitationId,
  findShadowInvitationByEmail,
} from "@/lib/data/store";

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

describe("ensureAccountApplication", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("creates a shadow invitation and application bound to the registered email", async () => {
    const { invitation, application } = await ensureAccountApplication({
      userId: "user_123",
      email: "account-user@example.com",
    });

    expect(invitation).toMatchObject({
      expertId: "account_user_123",
      email: "account-user@example.com",
      source: "ACCOUNT",
      tokenStatus: "ACTIVE",
      expiredAt: null,
    });
    expect(invitation.tokenHash).toBeTruthy();

    expect(application).toMatchObject({
      expertId: "account_user_123",
      invitationId: invitation.id,
      applicationStatus: "INIT",
      currentStep: "intro",
    });

    const storedInvitation = await findShadowInvitationByEmail(
      "account-user@example.com",
    );
    expect(storedInvitation?.id).toBe(invitation.id);

    const storedApplication = await findOpenApplicationByInvitationId(
      invitation.id,
    );
    expect(storedApplication?.id).toBe(application.id);
  });

  it("does not touch link-track invitations with the same email", async () => {
    await ensureAccountApplication({
      userId: "user_123",
      email: "init@example.com",
    });

    // The sample OPS invitation invitation_init shares this email; the shadow
    // lookup must only ever resolve the account-track record.
    const shadow = await findShadowInvitationByEmail("init@example.com");
    expect(shadow?.source).toBe("ACCOUNT");
    expect(shadow?.id).not.toBe("invitation_init");
  });

  it("resolves the initial review report recipient to the registered email", async () => {
    const { application } = await ensureAccountApplication({
      userId: "user_123",
      email: "account-user@example.com",
    });

    // Mirror the orchestrator's recipient fallback chain: the invitation
    // email wins over the screening emails, so account-track users receive
    // the report at their registered email.
    const invitation = await findInvitationById(application.invitationId);
    const recipient = resolveReportEmailRecipient({
      invitationEmail: invitation?.email,
      screeningContactEmail: "screening@example.com",
      screeningWorkEmail: null,
    });

    expect(recipient).toBe("account-user@example.com");
  });

  it("is idempotent across repeated calls", async () => {
    const first = await ensureAccountApplication({
      userId: "user_123",
      email: "account-user@example.com",
    });
    const second = await ensureAccountApplication({
      userId: "user_123",
      email: "account-user@example.com",
    });

    expect(second.invitation.id).toBe(first.invitation.id);
    expect(second.application.id).toBe(first.application.id);

    const store = (
      globalThis as typeof globalThis & {
        __autohireStore: {
          invitations: Array<{ source: string }>;
          applications: Array<{ invitationId: string }>;
        };
      }
    ).__autohireStore;
    expect(
      store.invitations.filter((item) => item.source === "ACCOUNT"),
    ).toHaveLength(1);
    expect(
      store.applications.filter(
        (item) => item.invitationId === first.invitation.id,
      ),
    ).toHaveLength(1);
  });

  it("recreates the application when only the shadow invitation exists", async () => {
    const first = await ensureAccountApplication({
      userId: "user_123",
      email: "account-user@example.com",
    });

    const store = (
      globalThis as typeof globalThis & {
        __autohireStore: { applications: Array<{ id: string }> };
      }
    ).__autohireStore;
    const index = store.applications.findIndex(
      (item) => item.id === first.application.id,
    );
    store.applications.splice(index, 1);

    const second = await ensureAccountApplication({
      userId: "user_123",
      email: "account-user@example.com",
    });

    expect(second.invitation.id).toBe(first.invitation.id);
    expect(second.application.invitationId).toBe(first.invitation.id);
    expect(second.application.applicationStatus).toBe("INIT");
  });
});
