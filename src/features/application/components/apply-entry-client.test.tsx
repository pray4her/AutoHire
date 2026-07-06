// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApplyEntryClient } from "@/features/application/components/apply-entry-client";
import type { ApplicationSnapshot } from "@/features/application/types";

const postIntroConfirmMock = vi.fn();
const trackClickMock = vi.fn();
const trackPageViewMock = vi.fn();
const pushMock = vi.fn();
const routerMock = {
  push: pushMock,
};

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/components/ui/page-shell", () => ({
  ActionButton: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  PageFrame: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PageShell: ({
    children,
    title,
    description,
    headerSlot,
  }: {
    children: ReactNode;
    title: string;
    description: string;
    headerSlot?: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {headerSlot}
      {children}
    </div>
  ),
  StatusBanner: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children?: ReactNode;
  }) => (
    <div>
      <p>{title}</p>
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  ),
}));

vi.mock("@/features/application/client", () => ({
  postIntroConfirm: (...args: Parameters<typeof postIntroConfirmMock>) =>
    postIntroConfirmMock(...args),
}));

vi.mock("@/features/application/route", () => ({
  buildApplyFlowStepLinks: () => [],
  getReachableFlowStep: () => 0,
  isFlowStepReadOnly: () => false,
}));

vi.mock("@/lib/tracking/client", () => ({
  trackClick: (...args: Parameters<typeof trackClickMock>) =>
    trackClickMock(...args),
  trackPageView: (...args: Parameters<typeof trackPageViewMock>) =>
    trackPageViewMock(...args),
}));

vi.mock("@/lib/tracking/use-page-duration-tracking", () => ({
  usePageDurationTracking: vi.fn(),
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
  invitationLinkExpiresAt: "2027-03-15T00:00:00.000Z",
};

describe("ApplyEntryClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    postIntroConfirmMock.mockResolvedValue(undefined);
    trackClickMock.mockResolvedValue(undefined);
    trackPageViewMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("opens the invitation notice once for an invite-link visit", async () => {
    const user = userEvent.setup();

    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={true}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Regarding Your Personalized Application Link"),
      ).toBeInTheDocument();
      expect(screen.getByText("Important Notice")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "I understand" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Regarding Your Personalized Application Link"),
      ).not.toBeInTheDocument();
    });

    expect(
      window.localStorage.getItem("apply-invite-notice-seen:invite_001"),
    ).toBe("seen");

    cleanup();
    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={true}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Continue to CV Submission" }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Regarding Your Personalized Application Link"),
    ).not.toBeInTheDocument();
  });

  it("does not open the invitation notice without an invite token", async () => {
    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={false}
      />,
    );

    expect(
      screen.queryByText("Regarding Your Personalized Application Link"),
    ).not.toBeInTheDocument();
  });

  it("cleans the invite bootstrap query param after rendering", async () => {
    window.history.replaceState({}, "", "/apply?invite=1");

    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={true}
      />,
    );

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
  });
});
