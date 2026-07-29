import { beforeEach, describe, expect, it, vi } from "vitest";

const writeStoredObjectMock = vi.hoisted(() => vi.fn());
const getEnvMock = vi.hoisted(() =>
  vi.fn(() => ({ FILE_STORAGE_MODE: "oss" as const })),
);

vi.mock("@/lib/storage/object-store", () => ({
  writeStoredObject: writeStoredObjectMock,
}));

vi.mock("@/lib/env", () => ({
  getEnv: getEnvMock,
  getRuntimeMode: () => "memory" as const,
}));

describe("extraction export orchestrator", () => {
  beforeEach(() => {
    vi.resetModules();
    writeStoredObjectMock.mockReset();
    writeStoredObjectMock.mockResolvedValue(undefined);
    getEnvMock.mockReturnValue({ FILE_STORAGE_MODE: "oss" });

    globalThis.__autohireStore = {
      invitations: [
        {
          id: "invitation_export",
          expertId: "expert_export",
          email: "export@example.com",
          tokenHash: "hash",
          hashAlgorithm: "SHA256",
          tokenStatus: "ACTIVE",
          expiredAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      applications: [
        {
          id: "app_export",
          expertId: "expert_export",
          invitationId: "invitation_export",
          applicationStatus: "ELIGIBLE",
          currentStep: "result",
          eligibilityResult: "ELIGIBLE",
          latestAnalysisJobId: "job_export",
          firstAccessedAt: new Date(),
          lastAccessedAt: new Date(),
          introConfirmedAt: new Date(),
          resumeUploadStartedAt: null,
          resumeUploadedAt: null,
          analysisStartedAt: null,
          analysisCompletedAt: null,
          materialsEnteredAt: null,
          submittedAt: null,
          screeningPassportFullName: "Export Expert",
          screeningContactEmail: "export@example.com",
          screeningWorkEmail: null,
          screeningPhoneNumber: "123",
          productInnovationDescription: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      resumeFiles: [],
      analysisJobs: [],
      analysisResults: [
        {
          id: "result_export",
          applicationId: "app_export",
          analysisJobId: "job_export",
          analysisRound: 1,
          eligibilityResult: "ELIGIBLE",
          reasonText: null,
          displaySummary: null,
          extractedFields: {
            name: "Export Expert",
            personal_email: "export@example.com",
            research_area: "Materials",
          },
          missingFields: [],
          createdAt: new Date(),
        },
      ],
      extractionReviews: [],
      secondaryAnalysisRuns: [],
      secondaryAnalysisFieldValues: [],
      secondaryAnalysisCallbackEvents: [],
      supplementalFields: [],
      materials: [],
      materialReviewRuns: [],
      materialCategoryReviews: [],
      supplementRequests: [],
      supplementUploadBatches: [],
      supplementFiles: [],
      feedbacks: [],
      initialMaterialReviewReportEmails: [],
      extractionExports: [],
      events: [],
      accessLogs: [],
      fileUploadAttempts: [],
    } as never;
  });

  it("skips when FILE_STORAGE_MODE is not oss", async () => {
    getEnvMock.mockReturnValue({ FILE_STORAGE_MODE: "mock" });
    const { exportConfirmedExtractionWorkbook } = await import(
      "@/lib/extraction-export/orchestrator"
    );

    const result = await exportConfirmedExtractionWorkbook({
      applicationId: "app_export",
      trigger: "CONFIRM",
    });

    expect(result).toEqual({ kind: "skipped_storage_mode" });
    expect(writeStoredObjectMock).not.toHaveBeenCalled();
  });

  it("uploads workbook and records success metadata", async () => {
    const { exportConfirmedExtractionWorkbook } = await import(
      "@/lib/extraction-export/orchestrator"
    );
    const { getApplicationExtractionExportByApplicationId } = await import(
      "@/lib/extraction-export/store"
    );

    const result = await exportConfirmedExtractionWorkbook({
      applicationId: "app_export",
      trigger: "CONFIRM",
    });

    expect(result.kind).toBe("uploaded");
    expect(writeStoredObjectMock).toHaveBeenCalledTimes(1);
    expect(writeStoredObjectMock.mock.calls[0]?.[0]).toBe(
      "applications/app_export/extraction-exports/confirmed-extraction.xlsx",
    );

    const record = await getApplicationExtractionExportByApplicationId(
      "app_export",
    );
    expect(record?.status).toBe("SUCCEEDED");
    expect(record?.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(record?.lastTrigger).toBe("CONFIRM");
    expect(record?.attemptCount).toBe(1);
  });

  it("skips PutObject when content hash is unchanged", async () => {
    const { exportConfirmedExtractionWorkbook } = await import(
      "@/lib/extraction-export/orchestrator"
    );

    await exportConfirmedExtractionWorkbook({
      applicationId: "app_export",
      trigger: "CONFIRM",
    });
    writeStoredObjectMock.mockClear();

    const second = await exportConfirmedExtractionWorkbook({
      applicationId: "app_export",
      trigger: "RESULT",
    });

    expect(second.kind).toBe("unchanged");
    expect(writeStoredObjectMock).not.toHaveBeenCalled();
  });

  it("re-uploads when latest supplement requests change content hash", async () => {
    const { exportConfirmedExtractionWorkbook } = await import(
      "@/lib/extraction-export/orchestrator"
    );

    await exportConfirmedExtractionWorkbook({
      applicationId: "app_export",
      trigger: "CONFIRM",
    });
    writeStoredObjectMock.mockClear();

    globalThis.__autohireStore!.supplementRequests = [
      {
        id: "req_export",
        applicationId: "app_export",
        category: "IDENTITY",
        reviewRunId: "run_export",
        categoryReviewId: "cat_export",
        title: "Passport bio page",
        reason: "Missing",
        suggestedMaterials: ["Passport"],
        aiMessage: null,
        status: "PENDING",
        isLatest: true,
        isSatisfied: false,
        satisfiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never;

    const second = await exportConfirmedExtractionWorkbook({
      applicationId: "app_export",
      trigger: "MATERIAL_REVIEW",
    });

    expect(second.kind).toBe("uploaded");
    expect(writeStoredObjectMock).toHaveBeenCalledTimes(1);

    const { getApplicationExtractionExportByApplicationId } = await import(
      "@/lib/extraction-export/store"
    );
    const record = await getApplicationExtractionExportByApplicationId(
      "app_export",
    );
    expect(record?.lastTrigger).toBe("MATERIAL_REVIEW");
  });

  it("marks dirty when lease is held and later reruns after reclaim", async () => {
    const store = await import("@/lib/extraction-export/store");
    await store.ensureApplicationExtractionExport({
      applicationId: "app_export",
      trigger: "CONFIRM",
    });
    await store.updateApplicationExtractionExport("app_export", {
      status: "RUNNING",
      leaseExpiresAt: new Date(Date.now() + 60_000),
      lastTrigger: "CONFIRM",
    });

    const { exportConfirmedExtractionWorkbook } = await import(
      "@/lib/extraction-export/orchestrator"
    );

    const busy = await exportConfirmedExtractionWorkbook({
      applicationId: "app_export",
      trigger: "FEEDBACK",
    });
    expect(busy.kind).toBe("busy");

    const record = await store.getApplicationExtractionExportByApplicationId(
      "app_export",
    );
    expect(record?.dirty).toBe(true);
    expect(record?.lastTrigger).toBe("FEEDBACK");
  });
});
