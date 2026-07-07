import { describe, expect, it } from "vitest";

import {
  ALL_CV_EXTRACTION_FIELD_ROWS,
  buildInitialCvReviewExtractionText,
  flattenExtractionMarkdownBulletList,
  formatExtractionMarkdownFieldValue,
  formatInitialCvReviewDisplayValue,
  getInitialCvReviewFieldHelp,
  INITIAL_CV_REVIEW_FIELD_ROWS,
} from "@/features/analysis/initial-cv-review-extract";

describe("formatInitialCvReviewDisplayValue", () => {
  it("replaces embedded null placeholders without changing surrounding content", () => {
    expect(
      formatInitialCvReviewDisplayValue(
        "Jan 2021 - Present: Hong Kong | Example | !!!null!!! | Chief Data Scientist | 无",
      ),
    ).toBe(
      "Jan 2021 - Present: Hong Kong | Example | Not provided | Chief Data Scientist | 无",
    );
  });

  it("handles placeholder casing and whitespace variants", () => {
    expect(formatInitialCvReviewDisplayValue("Before !!! Null !!! after")).toBe(
      "Before Not provided after",
    );
  });
});

describe("flattenExtractionMarkdownBulletList", () => {
  it("flattens uneven bullet indentation to a single list level", () => {
    expect(
      flattenExtractionMarkdownBulletList(
        "- Biofuel and biodiesel\n  - Biomass conversion\n  - Micro-algae cultivation",
      ),
    ).toBe(
      "- Biofuel and biodiesel\n- Biomass conversion\n- Micro-algae cultivation",
    );
  });

  it("normalizes leading spaces and alternate bullet markers", () => {
    expect(
      flattenExtractionMarkdownBulletList(
        "  - High-dimensional statistics\n  * Random matrix theory",
      ),
    ).toBe("- High-dimensional statistics\n- Random matrix theory");
  });
});

describe("formatExtractionMarkdownFieldValue", () => {
  it("applies null placeholder replacement before flattening bullets", () => {
    expect(
      formatExtractionMarkdownFieldValue(
        "- Topic A\n  - Topic B with !!!null!!! detail",
      ),
    ).toBe("- Topic A\n- Topic B with Not provided detail");
  });
});

describe("getInitialCvReviewFieldHelp", () => {
  it("returns help text for composite extraction fields", () => {
    expect(getInitialCvReviewFieldHelp("year_of_birth")).toContain(
      "If no explicit birth year is found in your CV",
    );
    expect(getInitialCvReviewFieldHelp("current_title_equivalence")).toContain(
      "position you currently hold",
    );
    expect(getInitialCvReviewFieldHelp("work_experience_2020_present")).toContain(
      "Start–End",
    );
    expect(getInitialCvReviewFieldHelp("current_country_of_employment")).toContain(
      "institution|region",
    );
    expect(getInitialCvReviewFieldHelp("name")).toBeNull();
  });
});

describe("buildInitialCvReviewExtractionText", () => {
  it("keeps the UI review table limited to the original 11 fields", () => {
    expect(INITIAL_CV_REVIEW_FIELD_ROWS).toHaveLength(11);
    expect(ALL_CV_EXTRACTION_FIELD_ROWS).toHaveLength(25);
    expect(
      INITIAL_CV_REVIEW_FIELD_ROWS.some(
        (row) => row.key === "education_history",
      ),
    ).toBe(false);
  });

  it("includes additional model-extracted fields after the editable review fields", () => {
    const text = buildInitialCvReviewExtractionText({
      name: "Corrected Name",
      personal_email: "candidate@example.com",
      education_history: ["Example University", "Example Institute"],
      custom_model_field: 12,
      profile_verified: true,
    });

    expect(text).toContain("- Name: Corrected Name");
    expect(text).toContain("- Personal Email: candidate@example.com");
    expect(text).toContain(
      '- Education History: ["Example University","Example Institute"]',
    );
    expect(text).toContain("- custom_model_field: 12");
    expect(text).toContain("- profile_verified: true");
  });
});
