export const INITIAL_CV_REVIEW_CONTACT_FIELD_KEYS = [
  "name",
  "personal_email",
  "work_email",
  "phone_number",
] as const;

export const REQUIRED_SCREENING_CONTACT_FIELD_KEYS = [
  "name",
  "personal_email",
] as const;

export const INITIAL_CV_REVIEW_CRITICAL_FIELD_KEYS = [
  "year_of_birth",
  "doctoral_degree_status",
  "doctoral_graduation_time",
  "current_title_equivalence",
  "current_country_of_employment",
  "work_experience_2020_present",
  "research_area",
] as const;

export const ALL_CV_EXTRACTION_FIELD_ROWS = [
  { key: "name", label: "Name" },
  { key: "personal_email", label: "Personal Email" },
  { key: "work_email", label: "Work Email" },
  { key: "phone_number", label: "Phone Number" },
  { key: "year_of_birth", label: "Year of Birth" },
  { key: "year_of_birth_source", label: "Year of Birth Source" },
  { key: "highest_degree_level", label: "Highest Degree Level" },
  { key: "education_history", label: "Education History" },
  { key: "doctoral_degree_status", label: "Doctoral Degree Status" },
  { key: "doctoral_graduation_time", label: "Doctoral Graduation Time" },
  {
    key: "doctoral_degree_institution_country_region",
    label: "Doctoral Degree Institution and Country/Region",
  },
  { key: "current_raw_title", label: "Current Raw Title" },
  { key: "current_title_equivalence", label: "Current Title Equivalence" },
  {
    key: "current_country_of_employment",
    label: "Current workplace Country/region of employment",
  },
  { key: "current_employment_nature", label: "Current Employment Nature" },
  {
    key: "current_employment_formality_judgment",
    label: "Current Employment Formality Judgment",
  },
  {
    key: "work_experience_2020_present",
    label: "Complete Work Experience Timeline",
  },
  {
    key: "complete_overseas_work_experience_timeline",
    label: "Complete Overseas Work Experience Timeline",
  },
  {
    key: "overseas_enterprise_work_experience_timeline",
    label: "Overseas Enterprise Work Experience Timeline",
  },
  {
    key: "postdoctoral_experience_timeline",
    label: "Postdoctoral Experience Timeline",
  },
  {
    key: "overseas_postdoctoral_experience_timeline",
    label: "Overseas Postdoctoral Experience Timeline",
  },
  {
    key: "work_experience_date_ambiguity",
    label: "Work Experience Date Ambiguity",
  },
  {
    key: "work_experience_date_ambiguity_notes",
    label: "Work Experience Date Ambiguity Notes",
  },
  { key: "research_area", label: "Research Area" },
  {
    key: "applied_industrial_relevance",
    label: "Applied/Industrial Relevance",
  },
] as const;

export type InitialCvReviewFieldKey =
  (typeof ALL_CV_EXTRACTION_FIELD_ROWS)[number]["key"];

export const INITIAL_CV_REVIEW_FIELD_ROWS = [
  { key: "name", label: "Name" },
  { key: "personal_email", label: "Personal Email" },
  { key: "work_email", label: "Work Email" },
  { key: "phone_number", label: "Phone Number" },
  { key: "year_of_birth", label: "Year of Birth" },
  { key: "doctoral_degree_status", label: "Doctoral Degree Status" },
  { key: "doctoral_graduation_time", label: "Doctoral Graduation Time" },
  { key: "current_title_equivalence", label: "Current Title Equivalence" },
  {
    key: "current_country_of_employment",
    label: "Current workplace Country/region of employment",
  },
  {
    key: "work_experience_2020_present",
    label: "Work Experience (2020–present)",
  },
  { key: "research_area", label: "Research Area" },
] as const satisfies ReadonlyArray<{
  key: InitialCvReviewFieldKey;
  label: string;
}>;

export const INITIAL_CV_REVIEW_EDITABLE_FIELD_KEYS = [
  "personal_email",
  "work_email",
  "phone_number",
  "year_of_birth",
  "doctoral_degree_status",
  "doctoral_graduation_time",
  "current_title_equivalence",
  "current_country_of_employment",
  "work_experience_2020_present",
  "research_area",
] as const satisfies readonly InitialCvReviewFieldKey[];

export const WORK_EXPERIENCE_2020_PRESENT_EDIT_PLACEHOLDER =
  "Please list your professional experience according to the format below:\n2002-2003, Canada, University of Saskatchewan, Department of Chemistry, Senior researcher, full-time";

/** Applicant-facing help for fields whose values combine multiple parts. */
export const INITIAL_CV_REVIEW_FIELD_HELP = {
  year_of_birth:
    "Enter the four-digit birth year shown on your official documents. If no explicit birth year is found in your CV, this field will be left blank for you to complete.",
  doctoral_graduation_time:
    "If you have multiple doctoral degrees (or doctoral degree equivalents), input the graduation time for the first one (please use the time indicated on your degree certificate); Please include the month and day when possible.",
  current_title_equivalence:
    "We will automatically match an officially recognized, standardized equivalent job title based on the position you currently hold, using only the position most relevant to the qualification review procedure.",
  current_country_of_employment:
    "The entry is presented as 'institution|region'.",
  work_experience_2020_present:
    "A structured timeline of your work and research roles. Each line follows Start–End: Country/Region | Institution | Department/Lab | Job title | Employment nature. “无” or “Not provided” means that part was not stated on your CV. The list may include roles before 2020 when they appear on your CV.",
  research_area:
    "This information is extracted from your CV and presented as bullet points. Please note that this is a brief summary of your scholarly work, rather than designated areas for collaboration with potential employers.",
} satisfies Partial<Record<InitialCvReviewFieldKey, string>>;

export function getInitialCvReviewFieldHelp(key: InitialCvReviewFieldKey) {
  return key in INITIAL_CV_REVIEW_FIELD_HELP
    ? INITIAL_CV_REVIEW_FIELD_HELP[
        key as keyof typeof INITIAL_CV_REVIEW_FIELD_HELP
      ]
    : null;
}

export function hasInitialCvReviewExtract(
  extractedFields: Record<string, unknown> | null | undefined,
) {
  if (!extractedFields) {
    return false;
  }

  for (const row of INITIAL_CV_REVIEW_FIELD_ROWS) {
    if (Object.prototype.hasOwnProperty.call(extractedFields, row.key)) {
      return true;
    }
  }

  return false;
}

export function getInitialCvReviewFieldValue(
  extractedFields: Record<string, unknown>,
  key: string,
) {
  const raw = extractedFields[key];

  if (raw === null || typeof raw === "undefined") {
    return "";
  }

  return serializeExtractionValue(raw);
}

export function formatInitialCvReviewDisplayValue(value: string) {
  return value.replace(/!!!\s*null\s*!!!/gi, "Not provided");
}

/** Flatten uneven bullet indentation so GFM does not render a false nested list. */
export function flattenExtractionMarkdownBulletList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => {
      const bulletMatch = line.match(/^\s*([-*•])\s+(.*)$/);

      if (bulletMatch) {
        return `- ${bulletMatch[2].trimEnd()}`;
      }

      return line;
    })
    .join("\n");
}

export function formatExtractionMarkdownFieldValue(value: string) {
  return flattenExtractionMarkdownBulletList(
    formatInitialCvReviewDisplayValue(value),
  );
}

export function buildInitialCvReviewExtractionText(
  extractedFields: Record<string, unknown>,
) {
  const rows = ALL_CV_EXTRACTION_FIELD_ROWS.map((row) => {
    const value = getInitialCvReviewFieldValue(extractedFields, row.key);

    return `- ${row.label}: ${value || "!!!null!!!"}`;
  });
  const knownKeys = new Set<string>(
    ALL_CV_EXTRACTION_FIELD_ROWS.map((row) => row.key),
  );
  const additionalRows = Object.entries(extractedFields)
    .filter(([key]) => !knownKeys.has(key))
    .map(([key, value]) => `- ${key}: ${serializeExtractionValue(value)}`);

  return ["### 1. Extracted Information", ...rows, ...additionalRows].join("\n");
}

function serializeExtractionValue(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "!!!null!!!";
  }

  if (typeof value === "string") {
    return value.trim() || "!!!null!!!";
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
