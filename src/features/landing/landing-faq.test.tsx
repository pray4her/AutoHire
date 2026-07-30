// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LandingFaq } from "@/features/landing/landing-faq";
import type { QaFaqEntry } from "@/features/qa/types";

const entries: readonly QaFaqEntry[] = [
  {
    id: "faq_1",
    slug: "who-can-apply",
    question: "Who can apply for the fund?",
    answer:
      "Overseas scholars meeting one of the three eligibility categories.",
    keywords: ["eligibility"],
    sortOrder: 1,
    isPublished: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "faq_2",
    slug: "application-window",
    question: "When is the official submission window?",
    answer: "Tentatively January to May each year.",
    keywords: ["window"],
    sortOrder: 2,
    isPublished: true,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

describe("LandingFaq", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders every passed entry as question and answer", () => {
    render(<LandingFaq entries={entries} />);

    for (const entry of entries) {
      expect(screen.getByText(entry.question)).toBeInTheDocument();
      expect(screen.getByText(entry.answer)).toBeInTheDocument();
    }
  });

  it("renders only the section header when no entries are passed", () => {
    render(<LandingFaq entries={[]} />);

    expect(
      screen.getByRole("heading", { name: "Questions, answered" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(entries[0].question)).not.toBeInTheDocument();
  });
});
