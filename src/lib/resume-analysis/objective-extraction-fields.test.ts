import { describe, expect, it } from "vitest";

import {
  buildSupplementalExtractionPatch,
  extractYearFromBirthDate,
  isInferredYearOfBirthSource,
  mergeSupplementalExtractionPatch,
  sanitizeInferredObjectiveExtractedFields,
} from "@/lib/resume-analysis/objective-extraction-fields";

describe("objective-extraction-fields", () => {
  it("detects inferred year-of-birth sources", () => {
    expect(
      isInferredYearOfBirthSource("Inferred from bachelor's graduation year"),
    ).toBe(true);
    expect(isInferredYearOfBirthSource("Explicit")).toBe(false);
    expect(isInferredYearOfBirthSource("!!!null!!!")).toBe(false);
  });

  it("extracts a four-digit year from supplemental birth dates", () => {
    expect(extractYearFromBirthDate("1991-03-15")).toBe("1991");
    expect(extractYearFromBirthDate("1991")).toBe("1991");
    expect(extractYearFromBirthDate("")).toBeNull();
  });

  it("clears inferred birth years for applicant confirmation", () => {
    expect(
      sanitizeInferredObjectiveExtractedFields({
        year_of_birth: "1986",
        year_of_birth_source: "Inferred from bachelor's graduation year",
        doctoral_degree_status: "Yes, obtained",
        doctoral_graduation_time: "2014",
        doctoral_degree_institution_country_region:
          "University of Rennes 1 | France",
      }),
    ).toMatchObject({
      year_of_birth: "",
      year_of_birth_source: "",
      doctoral_degree_status: "Yes, obtained",
      doctoral_graduation_time: "2014",
    });
  });

  it("clears unsupported doctoral claims without institution evidence", () => {
    expect(
      sanitizeInferredObjectiveExtractedFields({
        year_of_birth: "1990",
        year_of_birth_source: "Explicit",
        doctoral_degree_status: "Yes, obtained",
        doctoral_graduation_time: "2014",
        doctoral_degree_institution_country_region: "!!!null!!!",
      }),
    ).toMatchObject({
      doctoral_degree_status: "",
      doctoral_graduation_time: "",
    });
  });

  it("maps supplemental birth_date onto extracted year_of_birth", () => {
    expect(
      buildSupplementalExtractionPatch({
        birth_date: "1991-01-01",
      }),
    ).toEqual({
      year_of_birth: "1991",
      year_of_birth_source: "Explicit",
    });
  });

  it("merges supplemental birth dates over prior inferred values", () => {
    expect(
      mergeSupplementalExtractionPatch(
        {
          year_of_birth: "1986",
          year_of_birth_source: "Inferred from bachelor's graduation year",
        },
        { birth_date: "1991-06-01" },
      ),
    ).toEqual({
      year_of_birth: "1991",
      year_of_birth_source: "Explicit",
    });
  });
});
