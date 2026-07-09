// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApplyQaEntry,
  filterQaFaqEntries,
} from "@/features/qa/components/apply-qa-entry";
import type { QaFaqEntry } from "@/features/qa/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const FAQ_FIXTURES: readonly QaFaqEntry[] = [
  {
    id: "faq_1",
    slug: "resume-format",
    question: "What file formats are supported for resume uploads?",
    answer:
      "PDF is currently supported. We recommend uploading a version with stable formatting.",
    keywords: ["resume", "PDF", "upload"],
    sortOrder: 10,
    isPublished: true,
    createdAt: new Date("2026-07-06T00:00:00.000Z"),
    updatedAt: new Date("2026-07-06T00:00:00.000Z"),
  },
  {
    id: "faq_2",
    slug: "materials-review",
    question:
      "How soon will my materials be reviewed after supplemental submission?",
    answer:
      "After you submit supplemental materials, the review process will begin as soon as possible.",
    keywords: ["materials", "review", "supplemental"],
    sortOrder: 20,
    isPublished: true,
    createdAt: new Date("2026-07-06T00:00:00.000Z"),
    updatedAt: new Date("2026-07-06T00:00:00.000Z"),
  },
] as const;

describe("filterQaFaqEntries", () => {
  it("matches question, answer, and keyword text case-insensitively", () => {
    expect(filterQaFaqEntries(FAQ_FIXTURES, "pdf")).toEqual([FAQ_FIXTURES[0]]);
    expect(filterQaFaqEntries(FAQ_FIXTURES, "review")).toEqual([
      FAQ_FIXTURES[1],
    ]);
    expect(filterQaFaqEntries(FAQ_FIXTURES, "materials")).toEqual([
      FAQ_FIXTURES[1],
    ]);
  });
});

describe("ApplyQaEntry", () => {
  it("shows published FAQ content and filters it in the drawer", async () => {
    render(<ApplyQaEntry initialEntries={FAQ_FIXTURES} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Open application help" }),
    );

    expect(
      screen.getByRole("heading", { name: "Application help" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Answers to common questions about the application process.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "What file formats are supported for resume uploads?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "How soon will my materials be reviewed after supplemental submission?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "How soon will my materials be reviewed after supplemental submission?",
      }),
    ).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(
      screen.getByRole("button", {
        name: "What file formats are supported for resume uploads?",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: "What file formats are supported for resume uploads?",
      }),
    ).toHaveAttribute("aria-expanded", "true");

    await userEvent.type(
      screen.getByRole("searchbox", {
        name: "Search frequently asked questions",
      }),
      "PDF",
    );

    expect(
      screen.getByRole("button", {
        name: "What file formats are supported for resume uploads?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 matching question")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "How soon will my materials be reviewed after supplemental submission?",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty-state hint when no FAQ entries are available", async () => {
    render(<ApplyQaEntry initialEntries={[]} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Open application help" }),
    );

    expect(
      screen.getByText("Help topics aren’t available yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Contact the program team if you need support with your application.",
      ),
    ).toBeInTheDocument();
  });

  it("clears search from the empty results state", async () => {
    render(<ApplyQaEntry initialEntries={FAQ_FIXTURES} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Open application help" }),
    );
    await userEvent.type(
      screen.getByRole("searchbox", {
        name: "Search frequently asked questions",
      }),
      "zzzz-no-match",
    );

    expect(screen.getByText("No matching results")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(
      screen.getByRole("button", {
        name: "What file formats are supported for resume uploads?",
      }),
    ).toBeInTheDocument();
  });
});
