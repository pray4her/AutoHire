import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createQaFaqEntry,
  listPublishedQaFaqEntries,
  resetQaFaqStoreForTests,
} from "@/lib/qa/faq-store";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  resetQaFaqStoreForTests();
  vi.restoreAllMocks();
});

describe("QA FAQ store", () => {
  it("returns published entries ordered by sortOrder in memory mode", async () => {
    process.env = {
      ...originalEnv,
      APP_RUNTIME_MODE: "memory",
    };

    await createQaFaqEntry({
      slug: "draft-entry",
      question: "Draft",
      answer: "This should stay hidden.",
      keywords: [],
      sortOrder: 30,
      isPublished: false,
    });
    await createQaFaqEntry({
      slug: "visible-second",
      question: "Second visible question",
      answer: "Second visible answer",
      keywords: ["second"],
      sortOrder: 20,
      isPublished: true,
    });
    await createQaFaqEntry({
      slug: "visible-first",
      question: "First visible question",
      answer: "First visible answer",
      keywords: ["first"],
      sortOrder: 10,
      isPublished: true,
    });

    await expect(listPublishedQaFaqEntries()).resolves.toMatchObject([
      {
        slug: "visible-first",
        question: "First visible question",
      },
      {
        slug: "visible-second",
        question: "Second visible question",
      },
    ]);
  });
});
