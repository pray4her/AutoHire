// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ApplyEntryPage from "@/app/(public)/apply/page";
import type { ApplicationSnapshot } from "@/features/application/types";

const cookiesMock = vi.fn();
const redirectMock = vi.fn();
const resolveApplyEntryAccessFromSessionCookieMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: (...args: Parameters<typeof cookiesMock>) => cookiesMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: Parameters<typeof redirectMock>) => redirectMock(...args),
}));

vi.mock("@/components/ui/page-shell", () => ({
  PageFrame: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PageShell: ({
    children,
    title,
    description,
  }: {
    children: ReactNode;
    title: string;
    description: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
  StatusBanner: ({
    title,
    description,
  }: {
    title: string;
    description?: string | null;
  }) => (
    <div>
      <p>{title}</p>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock("@/features/application/components/apply-entry-client", () => ({
  ApplyEntryClient: ({
    openedFromInviteLink,
  }: {
    initialSnapshot: ApplicationSnapshot;
    openedFromInviteLink: boolean;
  }) => (
    <div>
      <span>apply-entry-client</span>
      <span>{openedFromInviteLink ? "invite" : "session"}</span>
    </div>
  ),
}));

vi.mock("@/features/application/components/apply-expired-read-only-entry", () => ({
  ApplyExpiredReadOnlyEntry: () => <div>expired-read-only-entry</div>,
}));

vi.mock("@/features/application/server/apply-entry-access", () => ({
  resolveApplyEntryAccessFromSessionCookie: (
    ...args: Parameters<typeof resolveApplyEntryAccessFromSessionCookieMock>
  ) => resolveApplyEntryAccessFromSessionCookieMock(...args),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionCookieName: () => "autohire_session",
}));

const snapshot: ApplicationSnapshot = {
  applicationId: "app_001",
  expertId: "expert_001",
  invitationId: "invite_001",
  applicationStatus: "INIT",
  currentStep: null,
  eligibilityResult: "UNKNOWN",
  latestAnalysisJobId: null,
  screeningPassportFullName: null,
  screeningContactEmail: null,
  screeningWorkEmail: null,
  screeningPhoneNumber: null,
  resumeAnalysisStatus: null,
  latestResumeFile: null,
  latestExtractionReview: null,
  latestResult: null,
  uploadedMaterialsSummary: {
    identity: 0,
    employment: 0,
    education: 0,
    honor: 0,
    patent: 0,
    project: 0,
    paper: 0,
    book: 0,
    conference: 0,
    product: 0,
  },
  productInnovationDescription: null,
  submittedAt: null,
  invitationLinkExpiresAt: null,
};

describe("ApplyEntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockReset();
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "session_cookie_value" }),
    });
    resolveApplyEntryAccessFromSessionCookieMock.mockResolvedValue({
      kind: "granted",
      snapshot,
      sessionToken: null,
      source: "session_cookie",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects token visits through the expert-session bootstrap route", async () => {
    redirectMock.mockImplementation(() => {
      throw new Error("redirect");
    });

    await expect(
      ApplyEntryPage({
        searchParams: Promise.resolve({ token: "sample-init-token" }),
      }),
    ).rejects.toThrow("redirect");

    expect(redirectMock).toHaveBeenCalledWith(
      "/api/expert-session?token=sample-init-token&redirectTo=%2Fapply%3Finvite%3D1",
    );
  });

  it("renders a controlled access error instead of the full intro when no session exists", async () => {
    resolveApplyEntryAccessFromSessionCookieMock.mockResolvedValue({
      kind: "rejected",
      code: "SESSION_REQUIRED",
      message: "No valid session was found. Please reopen the invitation link.",
      status: 401,
    });

    render(
      await ApplyEntryPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("Invitation required")).toBeInTheDocument();
    expect(
      screen.queryByText("apply-entry-client"),
    ).not.toBeInTheDocument();
  });

  it("renders the client entry after server-side access validation succeeds", async () => {
    render(
      await ApplyEntryPage({
        searchParams: Promise.resolve({ invite: "1" }),
      }),
    );

    expect(screen.getByText("apply-entry-client")).toBeInTheDocument();
    expect(screen.getByText("invite")).toBeInTheDocument();
  });

  it("keeps the intro page reachable for read-only review from in-app navigation", async () => {
    resolveApplyEntryAccessFromSessionCookieMock.mockResolvedValue({
      kind: "granted",
      snapshot: {
        ...snapshot,
        applicationStatus: "SUBMITTED",
      } satisfies ApplicationSnapshot,
      sessionToken: null,
      source: "session_cookie",
    });

    render(
      await ApplyEntryPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("apply-entry-client")).toBeInTheDocument();
    expect(screen.getByText("session")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders query-provided access errors without trying to restore a session", async () => {
    render(
      await ApplyEntryPage({
        searchParams: Promise.resolve({ accessError: "INVALID_TOKEN" }),
      }),
    );

    expect(screen.getByText("Invitation link invalid")).toBeInTheDocument();
    expect(resolveApplyEntryAccessFromSessionCookieMock).not.toHaveBeenCalled();
  });

  it("renders the expired read-only About GESF entry for EXPIRED_TOKEN", async () => {
    render(
      await ApplyEntryPage({
        searchParams: Promise.resolve({ accessError: "EXPIRED_TOKEN" }),
      }),
    );

    expect(screen.getByText("expired-read-only-entry")).toBeInTheDocument();
    expect(resolveApplyEntryAccessFromSessionCookieMock).not.toHaveBeenCalled();
  });

  it("redirects expired session restores into the expired read-only entry", async () => {
    resolveApplyEntryAccessFromSessionCookieMock.mockResolvedValue({
      kind: "rejected",
      code: "EXPIRED_TOKEN",
      message: "This invitation link has expired.",
      status: 410,
    });
    redirectMock.mockImplementation(() => {
      throw new Error("redirect");
    });

    await expect(
      ApplyEntryPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("redirect");

    expect(redirectMock).toHaveBeenCalledWith(
      "/apply?accessError=EXPIRED_TOKEN",
    );
  });
});
