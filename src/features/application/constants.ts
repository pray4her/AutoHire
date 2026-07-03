export const MATERIAL_CATEGORIES = [
  { key: "IDENTITY", label: "Identity Documents" },
  { key: "EDUCATION", label: "Education Documents" },
  { key: "EMPLOYMENT", label: "Employment Documents" },
  { key: "PROJECT", label: "Project Documents" },
  { key: "PAPER", label: "Paper Publications" },
  { key: "BOOK", label: "Authored Books" },
  { key: "CONFERENCE", label: "Conference Materials" },
  { key: "PATENT", label: "Patent Documents" },
  { key: "HONOR", label: "Honors and Awards" },
  { key: "PRODUCT", label: "Product" },
] as const;

export const APPLICATION_STATUSES = [
  "INIT",
  "INTRO_VIEWED",
  "CV_UPLOADED",
  "CV_EXTRACTING",
  "CV_EXTRACTION_REVIEW",
  "CV_ANALYZING",
  "INFO_REQUIRED",
  "REANALYZING",
  "INELIGIBLE",
  "ELIGIBLE",
  "SECONDARY_ANALYZING",
  "SECONDARY_REVIEW",
  "SECONDARY_FAILED",
  "MATERIALS_IN_PROGRESS",
  "SUBMITTED",
  "CLOSED",
] as const;

/** Placeholder inbox for expert feedback; replace with the operations-provided address. */
export const EXPERT_PROGRAM_CONTACT_EMAIL = "review-contact@example.com";
export const SUBMISSION_COMPLETE_CONTACT_EMAIL = "lishijing@1000help.com";
/** Official WeChat add-contact / profile link (encoded in QR on submission-complete). */
export const SUBMISSION_COMPLETE_WECHAT_URL =
  "https://u.wechat.com/MAPOu5JpI2RJTwPM2s_uy50?s=4";
export const SUBMISSION_COMPLETE_WHATSAPP_URL =
  "https://wa.me/qr/E75L2UF5M255N1";
export const APPLICATION_FEEDBACK_COMMENT_MAX_LENGTH = 2000;

export const APPLICATION_FLOW_STEPS = [
  {
    label: "CV Submission",
    hint: "Upload your latest CV and wait for the review outcome.",
  },
  {
    label: "Upload Required Documents",
    hint: "Upload supporting materials by category (or complete missing fields on the review page when required).",
  },
  {
    label: "Submission Complete",
    hint: "Finalize the package and review the tracking summary.",
  },
] as const;

/** Full journey including Step 0 (program brief on `/apply`) before formal steps. */
export const APPLICATION_FLOW_STEPS_WITH_INTRO = [
  {
    label: "About GESF",
    hint: "Review the GESF program scope, eligibility, and process.",
  },
  ...APPLICATION_FLOW_STEPS,
] as const;

/** Eligible CV review outcome — body copy on `/apply/result`. */
export const ELIGIBLE_ASSESSMENT_HEADING =
  "Congratulations! You are eligible to apply.";

export const ELIGIBLE_ASSESSMENT_INTRO =
  "We have saved your current progress. To proceed, please prepare the following required documents:";

export const ELIGIBLE_ASSESSMENT_DOCUMENTS = [
  "Valid ID or Passport",
  "Academic Certificates (Degree/Diploma)",
  "Professional Qualification Certificates (Proof of Employment)",
  "Academic Achievements (Papers, Patents, Projects, Awards, etc.)",
] as const;

export const ELIGIBLE_ASSESSMENT_FOOTNOTE =
  "Detailed upload guidelines and format requirements will be provided on the next page.";

export const CONTINUE_TO_UPLOAD_LABEL = "Continue to Upload";

/** Ineligible CV review outcome — closing copy on `/apply/result`. */
export const INELIGIBLE_CLOSING_MESSAGE =
  "Thank you for your interest. We look forward to serving you in the future.";

/** Shown after automated eligibility judgment on `/apply/result`. */
export const ELIGIBILITY_ASSESSMENT_ACCURACY_NOTE =
  "As job titles vary across different regions and countries, the system's eligibility assessment may contain minor discrepancies. All CVs will undergo a secondary manual review to ensure the accuracy of eligibility determinations.";

export const ELIGIBLE_DISPLAY_SUMMARY = [
  ELIGIBLE_ASSESSMENT_HEADING,
  "",
  ELIGIBLE_ASSESSMENT_INTRO,
  ...ELIGIBLE_ASSESSMENT_DOCUMENTS.map((document) => `- ${document}`),
  "",
  ELIGIBLE_ASSESSMENT_FOOTNOTE,
].join("\n");
