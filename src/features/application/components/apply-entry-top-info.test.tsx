// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
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

describe("ApplyEntryClient top info accordion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postIntroConfirmMock.mockResolvedValue(undefined);
    trackClickMock.mockResolvedValue(undefined);
    trackPageViewMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the top information accordion before the program introduction", () => {
    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={false}
      />,
    );

    const topInfoTrigger = screen.getByRole("button", { name: "who are we" });
    const gesfTrigger = screen.getByRole("button", {
      name: /Global Excellent Scientists Fund \(GESF\)/,
    });
    const documentPosition = topInfoTrigger.compareDocumentPosition(gesfTrigger);

    expect(documentPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the top information accordion single-open and exposes consultant links", async () => {
    const user = userEvent.setup();

    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={false}
      />,
    );

    const whoAreWeTrigger = screen.getByRole("button", { name: "who are we" });
    const qualificationTrigger = screen.getByRole("button", {
      name: "Why are we qualified to handle your application",
    });
    const consultantTrigger = screen.getByRole("button", {
      name: "Chat with a talent consultant",
    });

    expect(whoAreWeTrigger).toHaveAttribute("aria-expanded", "true");
    expect(qualificationTrigger).toHaveAttribute("aria-expanded", "false");

    await user.click(qualificationTrigger);

    expect(whoAreWeTrigger).toHaveAttribute("aria-expanded", "false");
    expect(qualificationTrigger).toHaveAttribute("aria-expanded", "true");

    const qualificationRegion = screen.getByRole("region", {
      name: "Why are we qualified to handle your application",
    });

    expect(
      within(qualificationRegion).getByText("ISO 27001 certified"),
    ).toBeInTheDocument();
    expect(
      within(qualificationRegion).getByText("5000+ overseas experts supported"),
    ).toBeInTheDocument();

    await user.click(consultantTrigger);

    expect(qualificationTrigger).toHaveAttribute("aria-expanded", "false");
    expect(consultantTrigger).toHaveAttribute("aria-expanded", "true");

    const consultantRegion = screen.getByRole("region", {
      name: "Chat with a talent consultant",
    });
    const emailLink = within(consultantRegion).getByRole("link", {
      name: /Email/i,
    });
    const whatsappLink = within(consultantRegion).getByRole("link", {
      name: /WhatsApp/i,
    });

    expect(emailLink).toHaveAttribute("href", "mailto:lishijing@1000help.com");
    expect(whatsappLink).toHaveAttribute(
      "href",
      "https://wa.me/8617363307362",
    );
  });
});
