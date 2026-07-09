import { beforeEach, describe, expect, it } from "vitest";

import { buildApplicantStageView } from "@/lib/application/applicant-stage-view";
import { updateApplication } from "@/lib/data/store";

function resetMemoryStore() {
  (
    globalThis as typeof globalThis & {
      __autohireStore?: unknown;
    }
  ).__autohireStore = undefined;
}

function collectKeys(value: unknown, prefix = ""): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectKeys(item, prefix ? `${prefix}[${index}]` : `[${index}]`),
    );
  }

  if (typeof value !== "object") {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return [path, ...collectKeys(child, path)];
    },
  );
}

describe("buildApplicantStageView", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("returns a public UI contract without server-only fields for extraction review", async () => {
    const view = await buildApplicantStageView("app_extraction_review");

    expect(view).not.toBeNull();
    expect(view).toMatchObject({
      applicationId: "app_extraction_review",
      phase: "review",
      nextPath: "/apply/result",
    });
    expect(view?.allowedActions).toEqual(
      expect.arrayContaining(["confirm_extraction"]),
    );
    expect(typeof view?.uiStatus).toBe("string");
    expect(view?.uiStatus.length).toBeGreaterThan(0);

    const keys = collectKeys(view);
    expect(keys.some((key) => key === "expertId" || key.endsWith(".expertId"))).toBe(
      false,
    );
    expect(
      keys.some(
        (key) => key === "invitationId" || key.endsWith(".invitationId"),
      ),
    ).toBe(false);
    expect(
      keys.some((key) => key === "objectKey" || key.endsWith(".objectKey")),
    ).toBe(false);
    expect(
      keys.some(
        (key) =>
          key === "externalJobId" || key.endsWith(".externalJobId"),
      ),
    ).toBe(false);
    expect(
      keys.some(
        (key) =>
          key === "rawExtractionResponse" ||
          key.endsWith(".rawExtractionResponse"),
      ),
    ).toBe(false);
    expect(
      keys.some(
        (key) =>
          key === "applicationStatus" || key.endsWith(".applicationStatus"),
      ),
    ).toBe(false);
  });

  it("maps representative internal statuses to phase and nextPath", async () => {
    await expect(buildApplicantStageView("app_intro")).resolves.toMatchObject({
      phase: "resume",
      nextPath: "/apply/resume",
      uiStatus: "ready_to_upload",
    });

    await expect(
      buildApplicantStageView("app_extraction_review"),
    ).resolves.toMatchObject({
      phase: "review",
      nextPath: "/apply/result",
      uiStatus: "confirm_extraction",
    });

    await expect(
      buildApplicantStageView("app_secondary"),
    ).resolves.toMatchObject({
      phase: "review",
      nextPath: "/apply/result",
      uiStatus: "eligible",
      allowedActions: expect.arrayContaining([
        "start_secondary_analysis",
        "enter_materials",
      ]),
    });
  });

  it("includes screening contact fields only when supplemental info is required", async () => {
    const needInfo = await buildApplicantStageView("app_progress");
    expect(needInfo).toMatchObject({
      uiStatus: "need_info",
      screeningPassportFullName: "Progress Expert",
      screeningContactEmail: "progress.expert@example.com",
    });
    expect(needInfo?.allowedActions).toEqual(
      expect.arrayContaining(["submit_supplemental_fields"]),
    );

    const extractionReview = await buildApplicantStageView(
      "app_extraction_review",
    );
    expect(extractionReview).not.toHaveProperty("screeningPassportFullName");
    expect(extractionReview).not.toHaveProperty("screeningContactEmail");
    expect(extractionReview?.extractedFields).toMatchObject({
      name: "Extraction Review Expert",
    });
  });

  it("maps materials and submitted stages to materials/done phases", async () => {
    await updateApplication("app_secondary", {
      applicationStatus: "MATERIALS_IN_PROGRESS",
      currentStep: "materials",
    });

    await expect(
      buildApplicantStageView("app_secondary"),
    ).resolves.toMatchObject({
      phase: "materials",
      nextPath: "/apply/materials",
      uiStatus: "materials_in_progress",
      allowedActions: expect.arrayContaining([
        "upload_material",
        "submit_application",
      ]),
    });

    await updateApplication("app_secondary", {
      applicationStatus: "SUBMITTED",
      currentStep: "materials",
      submittedAt: new Date("2026-07-09T00:00:00.000Z"),
    });

    const done = await buildApplicantStageView("app_secondary");
    expect(done).toMatchObject({
      phase: "done",
      nextPath: "/apply/submission-complete",
      uiStatus: "submitted",
      allowedActions: ["submit_feedback"],
      submittedAt: "2026-07-09T00:00:00.000Z",
    });
    expect(done).not.toHaveProperty("extractedFields");
    expect(done).not.toHaveProperty("latestResumeFile");
  });
});
