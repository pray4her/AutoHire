export const INITIAL_MATERIAL_REVIEW_REPORT_EMAIL_SUBJECT =
  "Your GESF Application — Initial Material Review Report";

export const INITIAL_MATERIAL_REVIEW_ELIGIBILITY_HEADLINE =
  "Your qualifications meet the basic requirements for this GESF application.";

export const INITIAL_MATERIAL_REVIEW_REPORT_MAX_ATTEMPTS = 3;

export const INITIAL_MATERIAL_REVIEW_REPORT_RETRY_BASE_DELAY_MS = 60_000;

export const INITIAL_MATERIAL_REVIEW_REPORT_EVENT_TYPES = {
  SKIPPED_NO_RECIPIENT: "initial_material_review_report_email_skipped_no_recipient",
  PERMANENT_FAILURE: "initial_material_review_report_email_permanent_failure",
} as const;
