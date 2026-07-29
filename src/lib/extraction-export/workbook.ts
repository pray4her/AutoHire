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
  EXTRACTION_EXPORT_SUPPLEMENT_REQUEST_COLUMNS,
  EXTRACTION_EXPORT_SUPPLEMENT_REQUESTS_SHEET_NAME,
} from "@/lib/extraction-export/constants";

export type ExtractionExportSupplementRequestInput = {
  category: string;
  title: string;
  reason: string | null;
  suggestedMaterials: unknown;
  status: string;
  isSatisfied: boolean;
  satisfiedAt: Date | string | null;
};

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
  supplementRequests?: ExtractionExportSupplementRequestInput[];
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

function normalizeSuggestedMaterials(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
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

export function buildSupplementRequestExportRows(
  requests: ExtractionExportSupplementRequestInput[],
): Array<Record<string, string>> {
  return requests.map((request) => ({
    category: toCellString(request.category),
    title: toCellString(request.title),
    reason: toCellString(request.reason),
    suggested_materials: normalizeSuggestedMaterials(
      request.suggestedMaterials,
    ).join("; "),
    status: toCellString(request.status),
    is_satisfied: request.isSatisfied ? "true" : "false",
    satisfied_at: toIsoUtc(request.satisfiedAt),
  }));
}

export function getExtractionExportColumnOrder() {
  return [
    ...EXTRACTION_EXPORT_METADATA_COLUMNS,
    ...ALL_CV_EXTRACTION_FIELD_ROWS.map((field) => field.key),
    ...EXTRACTION_EXPORT_FEEDBACK_COLUMNS,
  ];
}

export function getSupplementRequestExportColumnOrder() {
  return [...EXTRACTION_EXPORT_SUPPLEMENT_REQUEST_COLUMNS];
}

/**
 * Content identity excludes `exported_at` so unchanged business data can skip
 * PutObject even though the timestamp column would otherwise always differ.
 */
export function hashExtractionExportContent(
  row: Record<string, string>,
  supplementRows: Array<Record<string, string>> = [],
) {
  const header = getExtractionExportColumnOrder().filter(
    (column) => column !== "exported_at",
  );
  const extractionPayload = header
    .map((column) => `${column}=${row[column] ?? ""}`)
    .join("\n");
  const supplementHeader = getSupplementRequestExportColumnOrder();
  const supplementPayload = supplementRows
    .map((supplementRow) =>
      supplementHeader
        .map((column) => `${column}=${supplementRow[column] ?? ""}`)
        .join("|"),
    )
    .join("\n");

  return createHash("sha256")
    .update(`${extractionPayload}\n--\n${supplementPayload}`)
    .digest("hex");
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

  const supplementRows = buildSupplementRequestExportRows(
    input.supplementRequests ?? [],
  );
  const supplementHeader = getSupplementRequestExportColumnOrder();
  const supplementWorksheet =
    supplementRows.length > 0
      ? XLSX.utils.json_to_sheet(supplementRows, {
          header: [...supplementHeader],
        })
      : XLSX.utils.aoa_to_sheet([[...supplementHeader]]);
  XLSX.utils.book_append_sheet(
    workbook,
    supplementWorksheet,
    EXTRACTION_EXPORT_SUPPLEMENT_REQUESTS_SHEET_NAME,
  );

  const buffer: Buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  return {
    buffer,
    row,
    supplementRows,
    contentSha256: hashExtractionExportContent(row, supplementRows),
  };
}
