import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMaterialReviewRun,
  getApplicationById,
  updateApplication,
} from "@/lib/data/store";
import { resetEnvForTests } from "@/lib/env";
import { createRecordingEmailSender, type EmailSender } from "@/lib/email/transport";
import { INITIAL_MATERIAL_REVIEW_REPORT_EVENT_TYPES } from "@/lib/initial-material-review-report-email/constants";
import { trySendInitialMaterialReviewReportEmail } from "@/lib/initial-material-review-report-email/orchestrator";
import { getInitialMaterialReviewReportEmailByApplicationId } from "@/lib/initial-material-review-report-email/store";

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

async function listEvents(applicationId: string) {
  const store = (
    globalThis as typeof globalThis & {
      __autohireStore?: {
        events: Array<{ applicationId: string; eventType: string }>;
      };
    }
  ).__autohireStore;

  return (
    store?.events.filter((event) => event.applicationId === applicationId) ??
    []
  );
}

function clearInvitationEmail(applicationId: string) {
  const store = (
    globalThis as typeof globalThis & {
      __autohireStore?: {
        applications: Array<{ id: string; invitationId: string }>;
        invitations: Array<{ id: string; email: string | null }>;
      };
    }
  ).__autohireStore;

  const application = store?.applications.find((item) => item.id === applicationId);
  const invitation = store?.invitations.find(
    (item) => item.id === application?.invitationId,
  );

  if (invitation) {
    invitation.email = null;
  }
}

describe("trySendInitialMaterialReviewReportEmail", () => {
  let sender: EmailSender;
  let calls: ReturnType<typeof createRecordingEmailSender>["calls"];

  beforeEach(async () => {
    resetEnvForTests();
    process.env.APP_RUNTIME_MODE = "memory";
    resetMemoryStore();
    await getApplicationById("app_supplement_required");

    const recording = createRecordingEmailSender();
    sender = recording.sender;
    calls = recording.calls;
  });

  it("sends once for eligible initial completed review and records SENT", async () => {
    await updateApplication("app_supplement_required", {
      eligibilityResult: "ELIGIBLE",
    });

    const reviewRun = await createMaterialReviewRun({
      applicationId: "app_supplement_required",
      runNo: 1,
      triggerType: "INITIAL_SUBMISSION",
      status: "COMPLETED",
    });

    const result = await trySendInitialMaterialReviewReportEmail({
      applicationId: "app_supplement_required",
      reviewRunId: reviewRun.id,
      sender,
    });

    expect(result).toBe("sent");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.to).toBe("supplement-required@example.com");

    const record = await getInitialMaterialReviewReportEmailByApplicationId(
      "app_supplement_required",
    );
    expect(record?.status).toBe("SENT");
    expect(record?.reportPayload.categorySummary).toHaveLength(6);
  });

  it("does not send twice for duplicate sync", async () => {
    await updateApplication("app_supplement_required", {
      eligibilityResult: "ELIGIBLE",
    });

    const reviewRun = await createMaterialReviewRun({
      applicationId: "app_supplement_required",
      runNo: 1,
      triggerType: "INITIAL_SUBMISSION",
      status: "COMPLETED",
    });

    await trySendInitialMaterialReviewReportEmail({
      applicationId: "app_supplement_required",
      reviewRunId: reviewRun.id,
      sender,
    });

    const second = await trySendInitialMaterialReviewReportEmail({
      applicationId: "app_supplement_required",
      reviewRunId: reviewRun.id,
      sender,
    });

    expect(second).toBe("already_sent");
    expect(calls).toHaveLength(1);
  });

  it("skips non-eligible applications and logs when recipient is missing", async () => {
    await updateApplication("app_supplement_required", {
      eligibilityResult: "INELIGIBLE",
      screeningContactEmail: null,
      screeningWorkEmail: null,
    });

    const reviewRun = await createMaterialReviewRun({
      applicationId: "app_supplement_required",
      runNo: 1,
      triggerType: "INITIAL_SUBMISSION",
      status: "COMPLETED",
    });

    await expect(
      trySendInitialMaterialReviewReportEmail({
        applicationId: "app_supplement_required",
        reviewRunId: reviewRun.id,
        sender,
      }),
    ).resolves.toBe("not_eligible");

    clearInvitationEmail("app_supplement_required");
    await updateApplication("app_supplement_required", {
      eligibilityResult: "ELIGIBLE",
      screeningContactEmail: null,
      screeningWorkEmail: null,
    });

    const skipped = await trySendInitialMaterialReviewReportEmail({
      applicationId: "app_supplement_required",
      reviewRunId: reviewRun.id,
      sender,
    });

    expect(skipped).toBe("skipped");
    expect(calls).toHaveLength(0);

    const events = await listEvents("app_supplement_required");
    expect(
      events.some(
        (event) =>
          event.eventType ===
          INITIAL_MATERIAL_REVIEW_REPORT_EVENT_TYPES.SKIPPED_NO_RECIPIENT,
      ),
    ).toBe(true);
  });

  it("records FAILED with retry and succeeds on a later attempt", async () => {
    await updateApplication("app_supplement_required", {
      eligibilityResult: "ELIGIBLE",
    });

    const reviewRun = await createMaterialReviewRun({
      applicationId: "app_supplement_required",
      runNo: 1,
      triggerType: "INITIAL_SUBMISSION",
      status: "COMPLETED",
    });

    let attempts = 0;
    const flakySender: EmailSender = {
      send: vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("SMTP unavailable");
        }
        return { messageId: "retry-success" };
      }),
    };

    await expect(
      trySendInitialMaterialReviewReportEmail({
        applicationId: "app_supplement_required",
        reviewRunId: reviewRun.id,
        sender: flakySender,
        now: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("SMTP unavailable");

    let record = await getInitialMaterialReviewReportEmailByApplicationId(
      "app_supplement_required",
    );
    expect(record?.status).toBe("FAILED");
    expect(record?.attemptCount).toBe(1);

    const retry = await trySendInitialMaterialReviewReportEmail({
      applicationId: "app_supplement_required",
      reviewRunId: reviewRun.id,
      sender: flakySender,
      now: new Date("2026-01-01T01:00:00.000Z"),
    });

    expect(retry).toBe("sent");
    record = await getInitialMaterialReviewReportEmailByApplicationId(
      "app_supplement_required",
    );
    expect(record?.status).toBe("SENT");
    expect(record?.providerMessageId).toBe("retry-success");
  });
});
