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

export const MATERIAL_CATEGORY_SUMMARIES = {
  IDENTITY: {
    description: "Used for identification verification.",
  },
  EDUCATION: {
    description: "Used for educational background verification.",
  },
  EMPLOYMENT: {
    description: "Used for professional experience verification.",
  },
  PROJECT: {
    description:
      "Used for demonstration of academic competence and influence",
  },
  PAPER: {
    description:
      "Used for demonstration of academic output, innovation capacity and peer recognition.",
  },
  BOOK: {
    description:
      "Used for demonstration of academic output and innovative capacity.",
  },
  CONFERENCE: {
    description:
      "Used for demonstration of academic output and innovative capacity",
  },
  PATENT: {
    description:
      "Used for demonstration of academic output and innovative capacity",
  },
  HONOR: {
    description:
      "Used for demonstration of academic output and innovative capacity",
  },
  PRODUCT: {
    description:
      "Used for demonstration of academic output and innovative capacity",
  },
} as const satisfies Record<
  (typeof MATERIAL_CATEGORIES)[number]["key"],
  { description: string }
>;

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

/** Ineligible CV review outcome — fixed intro on `/apply/result`. */
export const INELIGIBLE_INTRO_MESSAGE =
  "Thank you for applying. Unfortunately, your profile does not currently meet the basic requirements for this talent program.";

/** Heading above the model-generated ineligibility reason. */
export const INELIGIBLE_REASON_HEADING = "Reason for ineligibility:";

/** Manual-review invitation shown instead of the generic accuracy note. */
export const INELIGIBLE_MANUAL_REVIEW_HEADING = "Did we make a mistake?";

export const INELIGIBLE_MANUAL_REVIEW_MESSAGE =
  "Job titles vary across regions. If you believe your qualifications match the criteria despite this result, please contact us via email, WeChat, phone, or WhatsApp. We would be happy to review your case manually.";

/** Ineligible CV review outcome — closing copy on `/apply/result`. */
export const INELIGIBLE_CLOSING_MESSAGE =
  "Thank you for your interest. We look forward to serving you in the future.";

/** Shown after eligible automated judgment on `/apply/result`. */
export const ELIGIBILITY_ASSESSMENT_ACCURACY_NOTE =
  "As job titles vary across different regions and countries, the system's eligibility assessment may contain minor discrepancies.";

export const PRIVACY_STATEMENT_ITEMS = [
  "Any personal information you provide will be used solely for eligibility evaluation, dossier preparation and supporting platform matching for this talent program, and will be treated with the strictest confidence.",
  "Your personal information will not be abused, published or shared with any third party without your prior consent.",
  "All information you submit can be permanently deleted upon your request.",
] as const;

export const ELIGIBLE_DISPLAY_SUMMARY = [
  ELIGIBLE_ASSESSMENT_HEADING,
  "",
  ELIGIBLE_ASSESSMENT_INTRO,
  ...ELIGIBLE_ASSESSMENT_DOCUMENTS.map((document) => `- ${document}`),
  "",
  ELIGIBLE_ASSESSMENT_FOOTNOTE,
].join("\n");
