// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ImgHTMLAttributes } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApplyEntryClient } from "@/features/application/components/apply-entry-client";
import { TESTIMONIAL_HIGHLIGHTS } from "@/features/application/components/apply-entry-intro-content";
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

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { fill, priority, unoptimized, alt = "", ...imgProps } = props;
    void fill;
    void priority;
    void unoptimized;

    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...imgProps} />;
  },
}));

vi.mock("yet-another-react-lightbox", () => ({
  default: () => null,
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
    description?: string | null;
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

describe("ApplyEntryClient footer navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem("apply-invite-notice-seen:invite_001", "seen");
    postIntroConfirmMock.mockResolvedValue(undefined);
    trackClickMock.mockResolvedValue(undefined);
    trackPageViewMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it("renders footer information as static full-width sections", () => {
    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={false}
      />,
    );

    expect(screen.getByTestId("apply-entry-footer-nav")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Who are we" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Company information" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Why are we qualified to handle your application",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders four footer sections in a horizontal row with vertical dividers", () => {
    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={false}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Company information" });
    const headings = within(nav).getAllByRole("heading", { level: 2 });
    const sections = Array.from(nav.querySelectorAll("section"));

    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Who are we",
      "Why are we qualified to handle your application",
      "Testimonials & Appreciation Highlights",
      "Chat with a talent consultant",
    ]);
    expect(nav).toHaveClass("flex", "flex-col", "lg:flex-row");
    expect(nav).toHaveClass("divide-y", "lg:divide-x", "lg:divide-y-0");
    expect(sections).toHaveLength(4);
    for (const section of sections) {
      expect(section).toHaveClass("flex-1", "flex-col");
      expect(section).not.toHaveClass("border-t", "lg:grid-cols-[16rem_minmax(0,1fr)]");
    }
    expect(
      screen.queryByTestId("apply-footer-section-correspondence-record"),
    ).not.toBeInTheDocument();
  });

  it("shows all non-testimonial footer content by default", () => {
    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={false}
      />,
    );

    const whoAreWeRegion = screen.getByRole("region", { name: "Who are we" });
    const qualificationRegion = screen.getByRole("region", {
      name: "Why are we qualified to handle your application",
    });
    const consultantRegion = screen.getByRole("region", {
      name: "Chat with a talent consultant",
    });

    expect(
      within(whoAreWeRegion).getByText(/Meet Technology \(Wuhan\) Co\., Ltd\./),
    ).toBeInTheDocument();
    expect(
      within(qualificationRegion).getByText("10+ years experience"),
    ).toBeInTheDocument();
    expect(
      within(qualificationRegion).getByText("5000+ overseas experts supported"),
    ).toBeInTheDocument();

    const emailLink = within(consultantRegion).getByRole("link", {
      name: /Email/i,
    });
    const whatsappLink = within(consultantRegion).getByRole("link", {
      name: /WhatsApp/i,
    });

    expect(emailLink).toHaveAttribute("href", "mailto:lishijing@1000help.com");
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/8617363307362");
  });

  it("combines the correspondence image into the testimonial highlights", () => {
    render(
      <ApplyEntryClient
        initialSnapshot={snapshot}
        openedFromInviteLink={false}
      />,
    );

    const testimonialsRegion = screen.getByRole("region", {
      name: "Testimonials & Appreciation Highlights",
    });

    expect(
      within(testimonialsRegion).getByTestId("testimonial-gallery"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("active-testimonial-image")).toHaveAttribute(
      "src",
      "/apply/testimonials/appreciation-letter-1.png",
    );
    expect(
      within(testimonialsRegion).queryAllByTestId("testimonial-thumbnail"),
    ).toHaveLength(0);
    expect(TESTIMONIAL_HIGHLIGHTS).toHaveLength(6);
    expect(TESTIMONIAL_HIGHLIGHTS.at(-1)).toMatchObject({
      alt: "Correspondence record with a selected candidate",
      src: "/apply/testimonials/appreciation-letter-6.png",
    });
  });
});
