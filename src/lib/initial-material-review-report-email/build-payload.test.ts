import { beforeEach, describe, expect, it } from "vitest";

import { resetEnvForTests } from "@/lib/env";
import { buildInitialMaterialReviewReportPayload } from "@/lib/initial-material-review-report-email/build-payload";
import {
  createMaterialCategoryReview,
  createMaterialReviewRun,
  createSupplementRequest,
  getApplicationById,
  updateApplication,
} from "@/lib/data/store";

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

describe("buildInitialMaterialReviewReportPayload", () => {
  beforeEach(async () => {
    resetEnvForTests();
    process.env.APP_RUNTIME_MODE = "memory";
    process.env.APP_BASE_URL = "https://example.test";
    resetMemoryStore();
    await getApplicationById("app_supplement_required");
  });

  it("includes six category outcomes and only pending latest requests", async () => {
    const payload = await buildInitialMaterialReviewReportPayload({
      applicationId: "app_supplement_required",
    });

    expect(payload.categorySummary).toHaveLength(6);
    expect(
      payload.categorySummary.some(
        (item) => item.outcome === "SUPPLEMENT_REQUIRED",
      ),
    ).toBe(true);
    expect(payload.pendingRequests.length).toBeGreaterThan(0);
    expect(payload.pendingRequests.every((item) => item.title.length > 0)).toBe(
      true,
    );
  });

  it("sets inviteTokenAvailable false when no plaintext token exists", async () => {
    await getApplicationById("app_submitted");

    const payload = await buildInitialMaterialReviewReportPayload({
      applicationId: "app_submitted",
    });

    expect(payload.inviteTokenAvailable).toBe(false);
    expect(payload.supplementDeepLink).toBeNull();
  });

  it("builds supplement deep link when plaintext token exists", async () => {
    await updateApplication("app_supplement_required", {
      screeningContactEmail: "expert@example.com",
    });

    const run = await createMaterialReviewRun({
      applicationId: "app_supplement_required",
      runNo: 99,
      triggerType: "MANUAL_RETRY",
      status: "COMPLETED",
    });

    await createMaterialCategoryReview({
      applicationId: "app_supplement_required",
      reviewRunId: run.id,
      category: "IDENTITY",
      roundNo: 1,
      status: "COMPLETED",
    });

    await createSupplementRequest({
      applicationId: "app_supplement_required",
      reviewRunId: run.id,
      categoryReviewId: "unused",
      category: "IDENTITY",
      title: "Upload passport",
      reason: "Missing identity proof",
      suggestedMaterials: ["Passport scan"],
      status: "PENDING",
      isLatest: true,
      isSatisfied: false,
    });

    const store = (
      globalThis as typeof globalThis & {
        __autohireStore?: {
          invitationGenerationItems: Array<{
            invitationId: string;
            plaintextToken: string;
          }>;
          applications: Array<{ id: string; invitationId: string }>;
        };
      }
    ).__autohireStore;

    const application = store?.applications.find(
      (item) => item.id === "app_supplement_required",
    );

    if (application && store) {
      store.invitationGenerationItems.push({
        id: "gen_item_test",
        batchId: "gen_batch_test",
        invitationId: application.invitationId,
        expertId: "expert_test",
        plaintextToken: "plain-token-123",
        tokenHash: "hash-token-123",
        inviteLink: "https://example.test/apply?t=plain-token-123",
        createdAt: new Date(),
      });
    }

    const payload = await buildInitialMaterialReviewReportPayload({
      applicationId: "app_supplement_required",
    });

    expect(payload.inviteTokenAvailable).toBe(true);
    expect(payload.supplementDeepLink).toBe(
      "https://example.test/apply/supplement?t=plain-token-123",
    );
  });
});
