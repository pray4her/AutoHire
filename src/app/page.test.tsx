// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PublicLandingPage from "@/app/page";
import { LANDING_HERO } from "@/features/landing/landing-content";
import type { QaFaqEntry } from "@/features/qa/types";

const listPublishedQaFaqEntriesMock = vi.fn();

vi.mock("@/lib/qa/faq-store", () => ({
  listPublishedQaFaqEntries: () => listPublishedQaFaqEntriesMock(),
}));

vi.mock("@/lib/tracking/client", () => ({
  trackClick: vi.fn(),
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}));

const faqEntry: QaFaqEntry = {
  id: "faq_1",
  slug: "who-can-apply",
  question: "Who can apply for the fund?",
  answer: "Overseas scholars meeting one of the three eligibility categories.",
  keywords: [],
  sortOrder: 1,
  isPublished: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("PublicLandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the hero and passes FAQ entries through", async () => {
    listPublishedQaFaqEntriesMock.mockResolvedValue([faqEntry]);

    render(await PublicLandingPage());

    expect(
      screen.getByRole("heading", { level: 1, name: LANDING_HERO.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(faqEntry.question)).toBeInTheDocument();
    expect(screen.getByText(faqEntry.answer)).toBeInTheDocument();
  });

  it("degrades to an empty FAQ list when the store fails", async () => {
    listPublishedQaFaqEntriesMock.mockRejectedValue(new Error("db down"));

    render(await PublicLandingPage());

    expect(
      screen.getByRole("heading", { level: 1, name: LANDING_HERO.title }),
    ).toBeInTheDocument();
    expect(screen.queryByText(faqEntry.question)).not.toBeInTheDocument();
  });
});
