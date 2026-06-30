import { beforeEach, describe, expect, it } from "vitest";

import { getApplicationById } from "@/lib/data/store";
import { resetEnvForTests } from "@/lib/env";
import {
  createInitialMaterialReviewReportEmail,
  getInitialMaterialReviewReportEmailByApplicationId,
} from "@/lib/initial-material-review-report-email/store";

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

describe("initial material review report email store", () => {
  beforeEach(async () => {
    resetEnvForTests();
    process.env.APP_RUNTIME_MODE = "memory";
    resetMemoryStore();
    await getApplicationById("app_submitted");
  });

  it("creates a report email record keyed by applicationId", async () => {
    const created = await createInitialMaterialReviewReportEmail({
      applicationId: "app_submitted",
      reviewRunId: "mr_run_initial",
      recipientEmail: "expert@example.com",
      subject: "Your GESF Application — Initial Material Review Report",
      reportPayload: {
        eligibility: {
          headline:
            "Your qualifications meet the basic requirements for this GESF application.",
        },
        categorySummary: [],
        pendingRequests: [],
        inviteTokenAvailable: false,
      },
      inviteTokenAvailable: false,
    });

    expect(created.applicationId).toBe("app_submitted");
    expect(created.status).toBe("PENDING");
    expect(created.attemptCount).toBe(0);

    const found = await getInitialMaterialReviewReportEmailByApplicationId(
      "app_submitted",
    );
    expect(found?.id).toBe(created.id);
  });

  it("enforces one report email record per application", async () => {
    await createInitialMaterialReviewReportEmail({
      applicationId: "app_submitted",
      reviewRunId: "mr_run_initial",
      recipientEmail: "expert@example.com",
      subject: "Your GESF Application — Initial Material Review Report",
      reportPayload: { categorySummary: [], pendingRequests: [] },
      inviteTokenAvailable: false,
    });

    await expect(
      createInitialMaterialReviewReportEmail({
        applicationId: "app_submitted",
        reviewRunId: "mr_run_initial_2",
        recipientEmail: "other@example.com",
        subject: "Your GESF Application — Initial Material Review Report",
        reportPayload: { categorySummary: [], pendingRequests: [] },
        inviteTokenAvailable: false,
      }),
    ).rejects.toThrow(/unique|already exists/i);
  });
});
