import { INITIAL_CV_REVIEW_CONTACT_FIELD_KEYS } from "@/features/analysis/initial-cv-review-extract";
import {
  getApplicationById,
  getApplicationFeedbackByApplicationId,
  getLatestAnalysisResult,
  getLatestExtractionReview,
  listLatestSupplementRequests,
} from "@/lib/data/store";
import { getEnv } from "@/lib/env";
import {
  EXTRACTION_EXPORT_DIRTY_RERUN_LIMIT,
  EXTRACTION_EXPORT_LEASE_MS,
  type ExtractionExportTrigger,
} from "@/lib/extraction-export/constants";
import {
  ensureApplicationExtractionExport,
  getApplicationExtractionExportByApplicationId,
  markApplicationExtractionExportDirty,
  tryClaimApplicationExtractionExportLease,
  updateApplicationExtractionExport,
} from "@/lib/extraction-export/store";
import {
  buildExtractionExportWorkbookBuffer,
} from "@/lib/extraction-export/workbook";
import { writeStoredObject } from "@/lib/storage/object-store";

function normalizeContactValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

/**
 * Prefer non-empty screening contact values over extracted field values.
 */
function mergeAuthoritativeExtractedFields(
  extractedFields: Record<string, unknown>,
  screening: {
    screeningPassportFullName?: string | null;
    screeningContactEmail?: string | null;
    screeningWorkEmail?: string | null;
    screeningPhoneNumber?: string | null;
  },
) {
  const merged = { ...extractedFields };
  const screeningByKey = {
    name: normalizeContactValue(screening.screeningPassportFullName),
    personal_email: normalizeContactValue(screening.screeningContactEmail),
    work_email: normalizeContactValue(screening.screeningWorkEmail),
    phone_number: normalizeContactValue(screening.screeningPhoneNumber),
  } as const;

  for (const key of INITIAL_CV_REVIEW_CONTACT_FIELD_KEYS) {
    if (screeningByKey[key]) {
      merged[key] = screeningByKey[key];
    }
  }

  return merged;
}

async function loadAuthoritativeSnapshot(applicationId: string) {
  const application = await getApplicationById(applicationId);
  if (!application) {
    throw new Error("Application was not found for extraction export.");
  }

  const latestResult = await getLatestAnalysisResult(applicationId);
  const latestReview = await getLatestExtractionReview(applicationId);

  const resultFields =
    latestResult?.extractedFields &&
    typeof latestResult.extractedFields === "object" &&
    !Array.isArray(latestResult.extractedFields)
      ? (latestResult.extractedFields as Record<string, unknown>)
      : null;
  const reviewFields =
    latestReview?.extractedFields &&
    typeof latestReview.extractedFields === "object" &&
    !Array.isArray(latestReview.extractedFields)
      ? (latestReview.extractedFields as Record<string, unknown>)
      : {};

  const baseFields = resultFields ?? reviewFields;
  const screening = {
    screeningPassportFullName: application.screeningPassportFullName,
    screeningContactEmail: application.screeningContactEmail,
    screeningWorkEmail: application.screeningWorkEmail,
    screeningPhoneNumber: application.screeningPhoneNumber,
  };

  const [feedback, latestSupplementRequests] = await Promise.all([
    getApplicationFeedbackByApplicationId(applicationId),
    listLatestSupplementRequests(applicationId),
  ]);

  return {
    applicationId,
    expertId: application.expertId,
    eligibilityResult: application.eligibilityResult,
    extractedFields: mergeAuthoritativeExtractedFields(baseFields, screening),
    screening,
    feedback,
    supplementRequests: latestSupplementRequests.map((request) => ({
      category: request.category,
      title: request.title,
      reason: request.reason,
      suggestedMaterials: request.suggestedMaterials,
      status: request.status,
      isSatisfied: request.isSatisfied,
      satisfiedAt: request.satisfiedAt,
    })),
  };
}

async function runOneExportAttempt(input: {
  applicationId: string;
  trigger: ExtractionExportTrigger;
  now: Date;
}) {
  const leaseExpiresAt = new Date(
    input.now.getTime() + EXTRACTION_EXPORT_LEASE_MS,
  );
  const claimed = await tryClaimApplicationExtractionExportLease({
    applicationId: input.applicationId,
    trigger: input.trigger,
    leaseExpiresAt,
    now: input.now,
  });

  if (!claimed) {
    await markApplicationExtractionExportDirty(
      input.applicationId,
      input.trigger,
    );
    return { kind: "busy" as const };
  }

  try {
    const snapshot = await loadAuthoritativeSnapshot(input.applicationId);
    const exportedAt = new Date();
    const { buffer, contentSha256 } = buildExtractionExportWorkbookBuffer({
      ...snapshot,
      exportedAt,
    });

    if (claimed.contentSha256 === contentSha256) {
      const afterSkip = await updateApplicationExtractionExport(
        input.applicationId,
        {
          status: "SUCCEEDED",
          leaseExpiresAt: null,
          errorMessage: null,
          lastAttemptAt: exportedAt,
        },
      );

      return {
        kind: "unchanged" as const,
        dirty: afterSkip.dirty,
      };
    }

    await writeStoredObject(
      claimed.objectKey,
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    const afterSuccess = await updateApplicationExtractionExport(
      input.applicationId,
      {
        status: "SUCCEEDED",
        contentSha256,
        fileSize: buffer.length,
        leaseExpiresAt: null,
        exportedAt,
        errorMessage: null,
        lastAttemptAt: exportedAt,
      },
    );

    return { kind: "uploaded" as const, dirty: afterSuccess.dirty };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction export failed.";
    const afterFailure = await updateApplicationExtractionExport(
      input.applicationId,
      {
        status: "FAILED",
        leaseExpiresAt: null,
        errorMessage: message,
        lastAttemptAt: new Date(),
      },
    );

    console.error("Extraction export failed.", {
      applicationId: input.applicationId,
      trigger: input.trigger,
      message,
    });

    return { kind: "failed" as const, dirty: afterFailure.dirty };
  }
}

export async function exportConfirmedExtractionWorkbook(input: {
  applicationId: string;
  trigger: ExtractionExportTrigger;
  now?: Date;
}) {
  const env = getEnv();
  if (env.FILE_STORAGE_MODE !== "oss") {
    return { kind: "skipped_storage_mode" as const };
  }

  await ensureApplicationExtractionExport({
    applicationId: input.applicationId,
    trigger: input.trigger,
  });

  let rounds = 0;
  let trigger = input.trigger;

  while (rounds < EXTRACTION_EXPORT_DIRTY_RERUN_LIMIT) {
    rounds += 1;
    const result = await runOneExportAttempt({
      applicationId: input.applicationId,
      trigger,
      now: input.now ?? new Date(),
    });

    if (result.kind === "busy") {
      return result;
    }

    if (!result.dirty) {
      return result;
    }

    const latest = await getApplicationExtractionExportByApplicationId(
      input.applicationId,
    );
    trigger = latest?.lastTrigger ?? trigger;
  }

  return { kind: "dirty_cap" as const };
}

/**
 * Fire-and-forget scheduler. Never throws to callers.
 */
export function scheduleConfirmedExtractionExport(input: {
  applicationId: string;
  trigger: ExtractionExportTrigger;
}) {
  void exportConfirmedExtractionWorkbook(input).catch((error) => {
    console.error("Scheduled extraction export crashed.", {
      applicationId: input.applicationId,
      trigger: input.trigger,
      message: error instanceof Error ? error.message : String(error),
    });
  });
}
