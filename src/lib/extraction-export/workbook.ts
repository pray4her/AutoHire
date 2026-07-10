import { createHash } from "node:crypto";

import * as XLSX from "xlsx";

import {
  ALL_CV_EXTRACTION_FIELD_ROWS,
  INITIAL_CV_REVIEW_CONTACT_FIELD_KEYS,
} from "@/features/analysis/initial-cv-review-extract";
import {
  EXTRACTION_EXPORT_FEEDBACK_COLUMNS,
  EXTRACTION_EXPORT_METADATA_COLUMNS,
  EXTRACTION_EXPORT_SHEET_NAME,
} from "@/lib/extraction-export/constants";

export type ExtractionExportSnapshotInput = {
  applicationId: string;
  expertId: string;
  eligibilityResult: string | null | undefined;
  extractedFields: Record<string, unknown>;
  screening: {
    screeningPassportFullName?: string | null;
    screeningContactEmail?: string | null;
    screeningWorkEmail?: string | null;
    screeningPhoneNumber?: string | null;
  };
  feedback?: {
    status: "DRAFT" | "SUBMITTED";
    comment: string | null;
    submittedAt: Date | string | null;
  } | null;
  exportedAt?: Date;
};

function toCellString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toIsoUtc(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

function preferScreeningContactFields(
  extractedFields: Record<string, unknown>,
  screening: ExtractionExportSnapshotInput["screening"],
) {
  const merged = { ...extractedFields };
  const screeningByKey = {
    name: toCellString(screening.screeningPassportFullName).trim(),
    personal_email: toCellString(screening.screeningContactEmail).trim(),
    work_email: toCellString(screening.screeningWorkEmail).trim(),
    phone_number: toCellString(screening.screeningPhoneNumber).trim(),
  } as const;

  for (const key of INITIAL_CV_REVIEW_CONTACT_FIELD_KEYS) {
    if (screeningByKey[key]) {
      merged[key] = screeningByKey[key];
    }
  }

  return merged;
}

export function buildExtractionExportRow(
  input: ExtractionExportSnapshotInput,
): Record<string, string> {
  const exportedAt = input.exportedAt ?? new Date();
  const mergedFields = preferScreeningContactFields(
    input.extractedFields,
    input.screening,
  );

  const row: Record<string, string> = {
    application_id: input.applicationId,
    expert_id: input.expertId,
    eligibility_result:
      input.eligibilityResult && input.eligibilityResult !== "UNKNOWN"
        ? input.eligibilityResult
        : "",
    exported_at: toIsoUtc(exportedAt),
  };

  for (const field of ALL_CV_EXTRACTION_FIELD_ROWS) {
    row[field.key] = toCellString(mergedFields[field.key]);
  }

  const submittedFeedback =
    input.feedback?.status === "SUBMITTED" ? input.feedback : null;

  row.feedback_comment = submittedFeedback
    ? toCellString(submittedFeedback.comment)
    : "";
  row.feedback_status = submittedFeedback ? "SUBMITTED" : "";
  row.feedback_submitted_at = submittedFeedback
    ? toIsoUtc(submittedFeedback.submittedAt)
    : "";

  return row;
}

export function getExtractionExportColumnOrder() {
  return [
    ...EXTRACTION_EXPORT_METADATA_COLUMNS,
    ...ALL_CV_EXTRACTION_FIELD_ROWS.map((field) => field.key),
    ...EXTRACTION_EXPORT_FEEDBACK_COLUMNS,
  ];
}

/**
 * Content identity excludes `exported_at` so unchanged business data can skip
 * PutObject even though the timestamp column would otherwise always differ.
 */
export function hashExtractionExportContent(row: Record<string, string>) {
  const header = getExtractionExportColumnOrder().filter(
    (column) => column !== "exported_at",
  );
  const payload = header.map((column) => `${column}=${row[column] ?? ""}`).join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function buildExtractionExportWorkbookBuffer(
  input: ExtractionExportSnapshotInput,
) {
  const row = buildExtractionExportRow(input);
  const header = getExtractionExportColumnOrder();
  const worksheet = XLSX.utils.json_to_sheet([row], { header: [...header] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    EXTRACTION_EXPORT_SHEET_NAME,
  );

  const buffer: Buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  return { buffer, row, contentSha256: hashExtractionExportContent(row) };
}
