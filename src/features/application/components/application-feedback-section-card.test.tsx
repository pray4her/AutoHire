// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { StrictMode, type ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFeedbackSectionCard } from "@/features/application/components/application-feedback-section-card";
import type { ApplicationFeedbackSnapshot } from "@/features/application/types";

const fetchApplicationFeedbackActionMock = vi.fn();

vi.mock("@/features/application/actions", () => ({
  fetchApplicationFeedbackAction: (
    ...args: Parameters<typeof fetchApplicationFeedbackActionMock>
  ) => fetchApplicationFeedbackActionMock(...args),
  saveFeedbackDraftAction: vi.fn(),
  submitFeedbackAction: vi.fn(),
}));

vi.mock("@/lib/tracking/client", () => ({
  getOrCreateTrackingSessionId: vi.fn(() => "sess_test"),
}));

vi.mock("@/components/ui/page-shell", () => ({
  SectionCard: ({
    children,
    title,
    description,
  }: {
    children: ReactNode;
    title?: string;
    description?: string;
  }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  StatusBanner: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <p>{title}</p>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  getInputClassName: () => "input",
}));

describe("ApplicationFeedbackSectionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchApplicationFeedbackActionMock.mockResolvedValue({
      status: "DRAFT",
      rating: null,
      comment: "",
      draftSavedAt: null,
      submittedAt: null,
    } satisfies ApplicationFeedbackSnapshot);
  });

  afterEach(() => {
    cleanup();
  });

  it("exits the loading state under React StrictMode after feedback is loaded", async () => {
    render(
      <StrictMode>
        <ApplicationFeedbackSectionCard
          applicationId="app_secondary"
          flowName="resume review"
          flowStep="eligibility_result"
          surface="resume_ineligible"
          title="Help us improve this review experience"
          description="If anything in this result felt unclear or inaccurate, you can leave feedback here."
          helperText="Your feedback will help us improve this eligibility review step."
        />
      </StrictMode>,
    );

    expect(screen.getByText("Loading feedback")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Loading feedback")).not.toBeInTheDocument();
      expect(
        screen.getByText("Write a comment to send feedback."),
      ).toBeInTheDocument();
    });
  });
});
