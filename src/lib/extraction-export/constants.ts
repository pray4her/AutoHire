export const EXTRACTION_EXPORT_OBJECT_KEY_SUFFIX =
  "extraction-exports/confirmed-extraction.xlsx";

export const EXTRACTION_EXPORT_LEASE_MS = 60_000;
export const EXTRACTION_EXPORT_DIRTY_RERUN_LIMIT = 5;

export const EXTRACTION_EXPORT_SHEET_NAME = "extraction";

export const EXTRACTION_EXPORT_METADATA_COLUMNS = [
  "application_id",
  "expert_id",
  "eligibility_result",
  "exported_at",
] as const;

export const EXTRACTION_EXPORT_FEEDBACK_COLUMNS = [
  "feedback_comment",
  "feedback_status",
  "feedback_submitted_at",
] as const;

export type ExtractionExportTrigger = "CONFIRM" | "RESULT" | "FEEDBACK";

export type ExtractionExportStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED";

export type ApplicationExtractionExportRecord = {
  id: string;
  applicationId: string;
  objectKey: string;
  status: ExtractionExportStatus;
  contentSha256: string | null;
  fileSize: number | null;
  dirty: boolean;
  leaseExpiresAt: Date | null;
  lastAttemptAt: Date | null;
  exportedAt: Date | null;
  errorMessage: string | null;
  lastTrigger: ExtractionExportTrigger | null;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function buildExtractionExportObjectKey(applicationId: string) {
  return `applications/${applicationId}/${EXTRACTION_EXPORT_OBJECT_KEY_SUFFIX}`;
}
