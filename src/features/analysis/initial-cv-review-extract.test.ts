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
  it("keeps the UI review table aligned with the current extraction contract", () => {
    expect(INITIAL_CV_REVIEW_FIELD_ROWS).toHaveLength(15);
    expect(ALL_CV_EXTRACTION_FIELD_ROWS).toHaveLength(15);
    expect(INITIAL_CV_REVIEW_FIELD_ROWS.map((row) => row.label)).toEqual([
      "Year of Birth",
      "Year of Birth Source",
      "Highest Degree Level",
      "Education History",
      "Doctoral Degree Status",
      "Doctoral Graduation Time",
      "Doctoral Degree Country/Region",
      "Current Title Equivalence",
      "Current Employment Country/Region",
      "Current Employment Formality Judgment",
      "Complete Work Experience Timeline",
      "Postdoctoral Experience Timeline",
      "Work Experience Date Ambiguity",
      "Research Area",
      "Applied/Industrial Relevance",
    ]);
  });

  it("includes additional model-extracted fields after the contract fields", () => {
    const text = buildInitialCvReviewExtractionText({
      year_of_birth: "1984",
      education_history: ["Example University", "Example Institute"],
      custom_model_field: 12,
      profile_verified: true,
    });

    expect(text).toContain("- Year of Birth: 1984");
    expect(text).toContain(
      '- Education History: ["Example University","Example Institute"]',
    );
    expect(text).toContain("- custom_model_field: 12");
    expect(text).toContain("- profile_verified: true");
  });
});
