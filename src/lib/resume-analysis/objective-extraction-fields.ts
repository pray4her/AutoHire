const INFERRED_YEAR_OF_BIRTH_SOURCE_PREFIX = "inferred from";

const EXPLICIT_YEAR_OF_BIRTH_SOURCE = "Explicit";

const DOCTORAL_DEGREE_OBTAINED = "Yes, obtained";

function normalizeScalar(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  return String(value).trim();
}

function isMissingExtractionMarker(value: string) {
  return !value || /^!!!\s*null\s*!!!$/i.test(value);
}

export function isInferredYearOfBirthSource(source: unknown) {
  const normalized = normalizeScalar(source).toLowerCase();

  if (!normalized || isMissingExtractionMarker(normalized)) {
    return false;
  }

  return (
    normalized !== EXPLICIT_YEAR_OF_BIRTH_SOURCE.toLowerCase() &&
    normalized.startsWith(INFERRED_YEAR_OF_BIRTH_SOURCE_PREFIX)
  );
}

export function extractYearFromBirthDate(value: unknown) {
  const normalized = normalizeScalar(value);

  if (!normalized) {
    return null;
  }

  const isoMatch = /^(\d{4})-\d{2}-\d{2}$/.exec(normalized);

  if (isoMatch) {
    return isoMatch[1] ?? null;
  }

  const yearOnlyMatch = /^(\d{4})$/.exec(normalized);

  if (yearOnlyMatch) {
    return yearOnlyMatch[1] ?? null;
  }

  const embeddedYearMatch = /(?:^|\D)((?:19|20)\d{2})(?=\D|$)/.exec(normalized);

  return embeddedYearMatch?.[1] ?? null;
}

/**
 * Upstream extraction may infer objective eligibility fields. For applicant
 * confirmation we only keep values that are explicitly sourced or corroborated.
 */
export function sanitizeInferredObjectiveExtractedFields(
  extractedFields: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...extractedFields };
  const yearOfBirthSource = normalizeScalar(next.year_of_birth_source);

  if (isInferredYearOfBirthSource(yearOfBirthSource)) {
    next.year_of_birth = "";
    next.year_of_birth_source = "";
  }

  const doctoralStatus = normalizeScalar(next.doctoral_degree_status);
  const doctoralGraduationTime = normalizeScalar(next.doctoral_graduation_time);
  const doctoralInstitution = normalizeScalar(
    next.doctoral_degree_institution_country_region,
  );
  const hasDoctoralInstitution = !isMissingExtractionMarker(doctoralInstitution);

  if (
    doctoralStatus === DOCTORAL_DEGREE_OBTAINED &&
    !hasDoctoralInstitution &&
    !isMissingExtractionMarker(doctoralGraduationTime)
  ) {
    next.doctoral_degree_status = "";
    next.doctoral_graduation_time = "";
  }

  return next;
}

export function buildSupplementalExtractionPatch(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const birthYear = extractYearFromBirthDate(fields.birth_date);

  if (birthYear) {
    patch.year_of_birth = birthYear;
    patch.year_of_birth_source = EXPLICIT_YEAR_OF_BIRTH_SOURCE;
  }

  const doctoralGraduationYear = normalizeScalar(fields.doctoral_graduation_year);

  if (doctoralGraduationYear) {
    patch.doctoral_graduation_time = doctoralGraduationYear;
  }

  const doctoralDegreeStatus = normalizeScalar(fields.doctoral_degree_status);

  if (doctoralDegreeStatus) {
    patch.doctoral_degree_status = doctoralDegreeStatus;
  }

  return patch;
}

export function mergeSupplementalExtractionPatch(
  extractedFields: Record<string, unknown>,
  supplementalFields: Record<string, unknown>,
) {
  const patch = buildSupplementalExtractionPatch(supplementalFields);

  if (Object.keys(patch).length === 0) {
    return extractedFields;
  }

  return {
    ...extractedFields,
    ...patch,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractSupplementalFieldValues(
  fieldValues: unknown,
): Record<string, unknown> {
  if (!isRecord(fieldValues)) {
    return {};
  }

  if (isRecord(fieldValues.valuesByFieldKey)) {
    return fieldValues.valuesByFieldKey;
  }

  return fieldValues;
}

export function applyObjectiveExtractionPresentationRules(
  extractedFields: Record<string, unknown>,
  supplementalFields?: Record<string, unknown>,
) {
  const merged = supplementalFields
    ? mergeSupplementalExtractionPatch(extractedFields, supplementalFields)
    : extractedFields;

  return sanitizeInferredObjectiveExtractedFields(merged);
}
