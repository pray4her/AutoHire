import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { ALL_CV_EXTRACTION_FIELD_ROWS } from "@/features/analysis/initial-cv-review-extract";
import {
  buildExtractionExportObjectKey,
} from "@/lib/extraction-export/constants";
import {
  buildExtractionExportRow,
  buildExtractionExportWorkbookBuffer,
  buildSupplementRequestExportRows,
  getExtractionExportColumnOrder,
  hashExtractionExportContent,
} from "@/lib/extraction-export/workbook";

describe("extraction export workbook", () => {
  it("builds a stable object key", () => {
    expect(buildExtractionExportObjectKey("app_001")).toBe(
      "applications/app_001/extraction-exports/confirmed-extraction.xlsx",
    );
  });

  it("orders metadata, extraction fields, then feedback columns", () => {
    const columns = getExtractionExportColumnOrder();
    expect(columns.slice(0, 4)).toEqual([
      "application_id",
      "expert_id",
      "eligibility_result",
      "exported_at",
    ]);
    expect(columns.slice(4, 4 + ALL_CV_EXTRACTION_FIELD_ROWS.length)).toEqual(
      ALL_CV_EXTRACTION_FIELD_ROWS.map((field) => field.key),
    );
    expect(columns.slice(-3)).toEqual([
      "feedback_comment",
      "feedback_status",
      "feedback_submitted_at",
    ]);
  });

  it("prefers screening contact values and leaves draft feedback empty", () => {
    const row = buildExtractionExportRow({
      applicationId: "app_001",
      expertId: "expert_001",
      eligibilityResult: "UNKNOWN",
      extractedFields: {
        name: "Extracted Name",
        personal_email: "extracted@example.com",
        research_area: "AI",
      },
      screening: {
        screeningPassportFullName: "Screening Name",
        screeningContactEmail: "screening@example.com",
        screeningPhoneNumber: "+86-100",
      },
      feedback: {
        status: "DRAFT",
        comment: "draft comment",
        submittedAt: null,
      },
      exportedAt: new Date("2026-07-09T06:00:00.000Z"),
    });

    expect(row.application_id).toBe("app_001");
    expect(row.eligibility_result).toBe("");
    expect(row.name).toBe("Screening Name");
    expect(row.personal_email).toBe("screening@example.com");
    expect(row.phone_number).toBe("+86-100");
    expect(row.research_area).toBe("AI");
    expect(row.feedback_comment).toBe("");
    expect(row.feedback_status).toBe("");
    expect(row.feedback_submitted_at).toBe("");
    expect(row.exported_at).toBe("2026-07-09T06:00:00.000Z");
  });

  it("writes submitted feedback even when comment is empty", () => {
    const row = buildExtractionExportRow({
      applicationId: "app_001",
      expertId: "expert_001",
      eligibilityResult: "ELIGIBLE",
      extractedFields: { name: "Jane" },
      screening: {},
      feedback: {
        status: "SUBMITTED",
        comment: "",
        submittedAt: new Date("2026-07-09T07:00:00.000Z"),
      },
      exportedAt: new Date("2026-07-09T08:00:00.000Z"),
    });

    expect(row.feedback_comment).toBe("");
    expect(row.feedback_status).toBe("SUBMITTED");
    expect(row.feedback_submitted_at).toBe("2026-07-09T07:00:00.000Z");
    expect(row.eligibility_result).toBe("ELIGIBLE");
  });

  it("hashes content without exported_at so unchanged data can skip upload", () => {
    const base = {
      applicationId: "app_001",
      expertId: "expert_001",
      eligibilityResult: "ELIGIBLE" as const,
      extractedFields: { name: "Jane", research_area: "AI" },
      screening: {},
      feedback: {
        status: "SUBMITTED" as const,
        comment: "great",
        submittedAt: new Date("2026-07-09T07:00:00.000Z"),
      },
    };

    const first = buildExtractionExportRow({
      ...base,
      exportedAt: new Date("2026-07-09T08:00:00.000Z"),
    });
    const second = buildExtractionExportRow({
      ...base,
      exportedAt: new Date("2026-07-09T09:00:00.000Z"),
    });

    expect(hashExtractionExportContent(first)).toBe(
      hashExtractionExportContent(second),
    );
    expect(first.exported_at).not.toBe(second.exported_at);
  });

  it("produces an xlsx buffer", () => {
    const { buffer, contentSha256 } = buildExtractionExportWorkbookBuffer({
      applicationId: "app_001",
      expertId: "expert_001",
      eligibilityResult: "INELIGIBLE",
      extractedFields: { name: "Jane" },
      screening: {},
      feedback: null,
      exportedAt: new Date("2026-07-09T06:00:00.000Z"),
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("maps isLatest supplement requests into export rows with joined materials", () => {
    const rows = buildSupplementRequestExportRows([
      {
        category: "IDENTITY",
        title: "Passport bio page",
        reason: "Unreadable scan",
        suggestedMaterials: ["Passport bio page", "National ID"],
        status: "PENDING",
        isSatisfied: false,
        satisfiedAt: null,
      },
      {
        category: "EDUCATION",
        title: "Degree certificate",
        reason: null,
        suggestedMaterials: [],
        status: "SATISFIED",
        isSatisfied: true,
        satisfiedAt: new Date("2026-07-10T08:00:00.000Z"),
      },
    ]);

    expect(rows).toEqual([
      {
        category: "IDENTITY",
        title: "Passport bio page",
        reason: "Unreadable scan",
        suggested_materials: "Passport bio page; National ID",
        status: "PENDING",
        is_satisfied: "false",
        satisfied_at: "",
      },
      {
        category: "EDUCATION",
        title: "Degree certificate",
        reason: "",
        suggested_materials: "",
        status: "SATISFIED",
        is_satisfied: "true",
        satisfied_at: "2026-07-10T08:00:00.000Z",
      },
    ]);
  });

  it("always includes supplement_requests sheet, with headers only when empty", () => {
    const empty = buildExtractionExportWorkbookBuffer({
      applicationId: "app_001",
      expertId: "expert_001",
      eligibilityResult: "ELIGIBLE",
      extractedFields: { name: "Jane" },
      screening: {},
      feedback: null,
      supplementRequests: [],
      exportedAt: new Date("2026-07-09T06:00:00.000Z"),
    });

    const emptyWorkbook = XLSX.read(empty.buffer, { type: "buffer" });
    expect(emptyWorkbook.SheetNames).toEqual([
      "extraction",
      "supplement_requests",
    ]);
    expect(
      XLSX.utils.sheet_to_json(emptyWorkbook.Sheets.supplement_requests!, {
        header: 1,
      }),
    ).toEqual([
      [
        "category",
        "title",
        "reason",
        "suggested_materials",
        "status",
        "is_satisfied",
        "satisfied_at",
      ],
    ]);

    const withRows = buildExtractionExportWorkbookBuffer({
      applicationId: "app_001",
      expertId: "expert_001",
      eligibilityResult: "ELIGIBLE",
      extractedFields: { name: "Jane" },
      screening: {},
      feedback: null,
      supplementRequests: [
        {
          category: "IDENTITY",
          title: "Passport bio page",
          reason: "Missing",
          suggestedMaterials: ["Passport"],
          status: "PENDING",
          isSatisfied: false,
          satisfiedAt: null,
        },
      ],
      exportedAt: new Date("2026-07-09T06:00:00.000Z"),
    });

    const populated = XLSX.read(withRows.buffer, { type: "buffer" });
    expect(
      XLSX.utils.sheet_to_json(populated.Sheets.supplement_requests!),
    ).toEqual([
      {
        category: "IDENTITY",
        title: "Passport bio page",
        reason: "Missing",
        suggested_materials: "Passport",
        status: "PENDING",
        is_satisfied: "false",
        satisfied_at: "",
      },
    ]);
  });

  it("changes content hash when supplement requests change", () => {
    const base = {
      applicationId: "app_001",
      expertId: "expert_001",
      eligibilityResult: "ELIGIBLE" as const,
      extractedFields: { name: "Jane" },
      screening: {},
      feedback: null,
      exportedAt: new Date("2026-07-09T06:00:00.000Z"),
    };

    const withoutRequests = buildExtractionExportWorkbookBuffer({
      ...base,
      supplementRequests: [],
    });
    const withRequests = buildExtractionExportWorkbookBuffer({
      ...base,
      supplementRequests: [
        {
          category: "IDENTITY",
          title: "Passport bio page",
          reason: "Missing",
          suggestedMaterials: ["Passport"],
          status: "PENDING",
          isSatisfied: false,
          satisfiedAt: null,
        },
      ],
    });

    expect(withoutRequests.contentSha256).not.toBe(withRequests.contentSha256);
  });
});
