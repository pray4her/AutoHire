import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as expertSessionGet } from "@/app/api/expert-session/route";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth/session";
import { hashInviteToken } from "@/lib/auth/token";
import { getApplicationById, listInviteAccessLogs } from "@/lib/data/store";

const getAccountSessionFromHeadersMock = vi.fn();

vi.mock("@/lib/account-auth/request-session", () => ({
  getAccountSessionFromHeaders: (
    ...args: Parameters<typeof getAccountSessionFromHeadersMock>
  ) => getAccountSessionFromHeadersMock(...args),
}));

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

type MemoryInvitation = {
  id: string;
  expertId: string;
  email: string | null;
  tokenHash: string;
  hashAlgorithm: "SHA256";
  tokenStatus: "ACTIVE" | "EXPIRED" | "DISABLED";
  source: "OPS" | "ACCOUNT";
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function memoryStore() {
  // Force the sample store to initialize, then hand back the live reference.
  await getApplicationById("app_intro");

  return (
    globalThis as typeof globalThis & {
      __autohireStore: {
        invitations: MemoryInvitation[];
        applications: Array<{ id: string; invitationId: string }>;
      };
    }
  ).__autohireStore;
}

describe("GET /api/expert-session", () => {
  beforeEach(() => {
    resetMemoryStore();
    getAccountSessionFromHeadersMock.mockReset();
    getAccountSessionFromHeadersMock.mockResolvedValue(null);
  });

  it("logs invalid invite access attempts", async () => {
    const response = await expertSessionGet(
      new NextRequest("http://localhost/api/expert-session?token=bad-token", {
        headers: {
          "x-autohire-session-id": "sess_invalid",
          "x-autohire-request-id": "req_invalid",
          "x-forwarded-for": "203.0.113.10",
          referer: "http://localhost/apply?t=bad-token",
        },
      }),
    );

    expect(response.status).toBe(401);

    const accessLogs = await listInviteAccessLogs();
    expect(accessLogs[0]).toMatchObject({
      accessResult: "INVALID",
      sessionId: "sess_invalid",
      requestId: "req_invalid",
      ipAddress: "203.0.113.10",
      applicationId: null,
    });
  });

  it("logs valid entry and session restore events", async () => {
    const initialResponse = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=sample-init-token",
        {
          headers: {
            "x-autohire-session-id": "sess_valid",
            "x-autohire-request-id": "req_valid",
            "x-forwarded-for": "198.51.100.20",
            referer: "http://localhost/apply?t=sample-init-token",
          },
        },
      ),
    );

    expect(initialResponse.status).toBe(200);

    const setCookie = initialResponse.headers.get("set-cookie");
    expect(setCookie).toContain(getSessionCookieName());
    const cookieValue =
      setCookie?.match(new RegExp(`${getSessionCookieName()}=([^;]+)`))?.[1] ??
      "";
    const session = verifySessionToken(cookieValue);
    expect(session).not.toBeNull();

    const restoredResponse = await expertSessionGet(
      new NextRequest("http://localhost/api/expert-session", {
        headers: {
          cookie: `${getSessionCookieName()}=${cookieValue}`,
          "x-autohire-session-id": "sess_restore",
          "x-autohire-request-id": "req_restore",
          "x-forwarded-for": "198.51.100.21",
          referer: "http://localhost/apply/resume",
        },
      }),
    );

    expect(restoredResponse.status).toBe(200);

    const accessLogs = await listInviteAccessLogs();
    expect(accessLogs.some((item) => item.accessResult === "VALID")).toBe(true);
    expect(
      accessLogs.some(
        (item) =>
          item.accessResult === "SESSION_RESTORE" &&
          item.sessionId === "sess_restore" &&
          item.ipAddress === "198.51.100.21",
      ),
    ).toBe(true);

    const application = await getApplicationById(session?.applicationId ?? "");
    expect(application?.firstAccessedAt).not.toBeNull();
    expect(application?.lastAccessedAt).not.toBeNull();
  });

  it("sets a session cookie and redirects back to apply for token bootstrap", async () => {
    const response = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=sample-init-token&redirectTo=%2Fapply%3Finvite%3D1",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/apply?invite=1",
    );

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${getSessionCookieName()}=`);
  });

  it("prefers forwarded public host headers when building apply bootstrap redirects", async () => {
    const response = await expertSessionGet(
      new NextRequest(
        "http://localhost:3000/api/expert-session?token=sample-init-token&redirectTo=%2Fapply%3Finvite%3D1",
        {
          headers: {
            "x-forwarded-host": "talent.1000help.com",
            "x-forwarded-proto": "https",
          },
        },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://talent.1000help.com/apply?invite=1",
    );
  });

  it("redirects invalid invite links to a controlled apply error state", async () => {
    const response = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=bad-token&redirectTo=%2Fapply%3Finvite%3D1",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/apply?accessError=INVALID_TOKEN",
    );
  });

  it("uses a legal redirect status for invalid invite bootstrap redirects", async () => {
    const response = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=bad-token&redirectTo=%2Fapply%3Finvite%3D1",
        {
          headers: {
            "x-forwarded-host": "talent.1000help.com",
            "x-forwarded-proto": "https",
          },
        },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://talent.1000help.com/apply?accessError=INVALID_TOKEN",
    );
  });

  it("rejects session restore when the invitation was disabled after login", async () => {
    const initialResponse = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=sample-init-token",
      ),
    );

    expect(initialResponse.status).toBe(200);

    const cookieValue =
      initialResponse.headers
        .get("set-cookie")
        ?.match(new RegExp(`${getSessionCookieName()}=([^;]+)`))?.[1] ?? "";

    const store = (
      globalThis as typeof globalThis & {
        __autohireStore?: {
          invitations: Array<{
            id: string;
            tokenStatus: "ACTIVE" | "EXPIRED" | "DISABLED";
          }>;
        };
      }
    ).__autohireStore;

    const invitation = store?.invitations.find((item) => item.id === "invitation_init");
    expect(invitation).toBeDefined();
    invitation!.tokenStatus = "DISABLED";

    const restoredResponse = await expertSessionGet(
      new NextRequest("http://localhost/api/expert-session", {
        headers: {
          cookie: `${getSessionCookieName()}=${cookieValue}`,
        },
      }),
    );

    expect(restoredResponse.status).toBe(403);
    await expect(restoredResponse.json()).resolves.toMatchObject({
      code: "DISABLED_TOKEN",
    });
  });

  it("clears the session cookie when redirecting an expired invite bootstrap", async () => {
    const initialResponse = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=sample-init-token",
      ),
    );

    expect(initialResponse.status).toBe(200);

    const store = (
      globalThis as typeof globalThis & {
        __autohireStore?: {
          invitations: Array<{
            id: string;
            tokenStatus: "ACTIVE" | "EXPIRED" | "DISABLED";
            expiredAt: Date | null;
          }>;
        };
      }
    ).__autohireStore;

    const invitation = store?.invitations.find(
      (item) => item.id === "invitation_init",
    );
    expect(invitation).toBeDefined();
    invitation!.tokenStatus = "EXPIRED";
    invitation!.expiredAt = new Date(Date.now() - 60_000);

    const response = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=sample-init-token&redirectTo=%2Fapply%3Finvite%3D1",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/apply?accessError=EXPIRED_TOKEN",
    );

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${getSessionCookieName()}=`);
    expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
  });

  it("clears the session cookie when restoring an expired invitation session", async () => {
    const initialResponse = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=sample-init-token",
      ),
    );

    expect(initialResponse.status).toBe(200);

    const cookieValue =
      initialResponse.headers
        .get("set-cookie")
        ?.match(new RegExp(`${getSessionCookieName()}=([^;]+)`))?.[1] ?? "";

    const store = (
      globalThis as typeof globalThis & {
        __autohireStore?: {
          invitations: Array<{
            id: string;
            tokenStatus: "ACTIVE" | "EXPIRED" | "DISABLED";
            expiredAt: Date | null;
          }>;
        };
      }
    ).__autohireStore;

    const invitation = store?.invitations.find(
      (item) => item.id === "invitation_init",
    );
    expect(invitation).toBeDefined();
    invitation!.tokenStatus = "EXPIRED";
    invitation!.expiredAt = new Date(Date.now() - 60_000);

    const restoredResponse = await expertSessionGet(
      new NextRequest("http://localhost/api/expert-session", {
        headers: {
          cookie: `${getSessionCookieName()}=${cookieValue}`,
        },
      }),
    );

    expect(restoredResponse.status).toBe(410);
    await expect(restoredResponse.json()).resolves.toMatchObject({
      code: "EXPIRED_TOKEN",
    });

    const setCookie = restoredResponse.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${getSessionCookieName()}=`);
    expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
  });

  it("rejects tokens that resolve to a shadow (account-track) invitation", async () => {
    const store = await memoryStore();
    const now = new Date();
    store.invitations.push({
      id: "invitation_shadow_test",
      expertId: "account_user_shadow",
      email: "shadow@example.com",
      tokenHash: hashInviteToken("shadow-plaintext-token"),
      hashAlgorithm: "SHA256",
      tokenStatus: "ACTIVE",
      source: "ACCOUNT",
      expiredAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const response = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=shadow-plaintext-token",
      ),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_TOKEN",
    });

    const redirectResponse = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?token=shadow-plaintext-token&redirectTo=%2Fapply%3Finvite%3D1",
      ),
    );

    expect(redirectResponse.status).toBe(307);
    expect(redirectResponse.headers.get("location")).toBe(
      "http://localhost:3000/apply?accessError=INVALID_TOKEN",
    );

    const storeAfter = await memoryStore();
    expect(
      storeAfter.applications.some(
        (item) => item.invitationId === "invitation_shadow_test",
      ),
    ).toBe(false);
  });

  it("bootstraps an account session into the shared application session", async () => {
    getAccountSessionFromHeadersMock.mockResolvedValue({
      userId: "user_bootstrap",
      email: "bootstrap@example.com",
    });

    const response = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?account=1&redirectTo=%2Fapply%3Finvite%3D1",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/apply?invite=1",
    );

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${getSessionCookieName()}=`);
    expect(setCookie.toLowerCase()).not.toMatch(/max-age=0/);

    const cookieValue =
      setCookie.match(new RegExp(`${getSessionCookieName()}=([^;]+)`))?.[1] ??
      "";
    const session = verifySessionToken(cookieValue);
    expect(session).not.toBeNull();

    const store = await memoryStore();
    const shadowInvitation = store.invitations.find(
      (item) => item.source === "ACCOUNT",
    );
    expect(shadowInvitation).toMatchObject({
      expertId: "account_user_bootstrap",
      email: "bootstrap@example.com",
      tokenStatus: "ACTIVE",
      expiredAt: null,
    });
    expect(session?.invitationId).toBe(shadowInvitation?.id);

    const application = store.applications.find(
      (item) => item.invitationId === shadowInvitation?.id,
    );
    expect(application?.id).toBe(session?.applicationId);

    // The issued cookie converges onto the standard session-restore path.
    getAccountSessionFromHeadersMock.mockResolvedValue(null);
    const restoredResponse = await expertSessionGet(
      new NextRequest("http://localhost/api/expert-session", {
        headers: { cookie: `${getSessionCookieName()}=${cookieValue}` },
      }),
    );
    expect(restoredResponse.status).toBe(200);
    await expect(restoredResponse.json()).resolves.toMatchObject({
      applicationId: application?.id,
    });
  });

  it("redirects account bootstrap to login when no account session exists", async () => {
    const response = await expertSessionGet(
      new NextRequest(
        "http://localhost/api/expert-session?account=1&redirectTo=%2Fapply%3Finvite%3D1",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("restores the account-track application when the cookie is missing", async () => {
    getAccountSessionFromHeadersMock.mockResolvedValue({
      userId: "user_restore",
      email: "restore@example.com",
    });

    const response = await expertSessionGet(
      new NextRequest("http://localhost/api/expert-session"),
    );

    expect(response.status).toBe(200);
    const snapshot = await response.json();
    expect(snapshot.applicationId).toBeTruthy();

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${getSessionCookieName()}=`);

    const store = await memoryStore();
    const shadowInvitation = store.invitations.find(
      (item) => item.source === "ACCOUNT" && item.email === "restore@example.com",
    );
    expect(shadowInvitation).toBeDefined();

    // A second restore reuses the same shadow application (idempotent).
    const secondResponse = await expertSessionGet(
      new NextRequest("http://localhost/api/expert-session"),
    );
    expect(secondResponse.status).toBe(200);
    await expect(secondResponse.json()).resolves.toMatchObject({
      applicationId: snapshot.applicationId,
    });
  });

  it("keeps rejecting cookie-less restores when no account session exists", async () => {
    const response = await expertSessionGet(
      new NextRequest("http://localhost/api/expert-session"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "SESSION_REQUIRED",
    });
  });
});
