import { describe, expect, it } from "vitest";

import {
  MAX_FILE_SIZE_BYTES,
  MAX_PRODUCT_MATERIAL_BYTES,
} from "@/features/upload/constants";
import { validateUpload } from "@/lib/validation/upload";

describe("validateUpload", () => {
  it("accepts valid resume file types from the shared allowlist", () => {
    expect(validateUpload("resume.pdf", MAX_FILE_SIZE_BYTES)).toEqual({
      valid: true,
    });
    expect(validateUpload("resume.docx", MAX_FILE_SIZE_BYTES)).toEqual({
      valid: true,
    });
    expect(validateUpload("resume.png", MAX_FILE_SIZE_BYTES)).toEqual({
      valid: true,
    });
  });

  it("accepts shared allowlist types for original non-product material categories", () => {
    expect(
      validateUpload("paper-scan.jpg", MAX_FILE_SIZE_BYTES, {
        category: "PAPER",
      }),
    ).toEqual({ valid: true });
    expect(
      validateUpload("book-cover.webp", 1024, { category: "BOOK" }),
    ).toEqual({ valid: true });
  });

  it("accepts supplement categories when the file matches the shared allowlist", () => {
    expect(
      validateUpload("supplement.pdf", MAX_FILE_SIZE_BYTES, {
        category: "PROJECT",
      }),
    ).toEqual({ valid: true });
    expect(
      validateUpload("records.docx", MAX_FILE_SIZE_BYTES, {
        category: "HONOR",
      }),
    ).toEqual({ valid: true });
  });

  it("rejects supplement categories when the extension is outside the shared allowlist", () => {
    expect(
      validateUpload("supplement.mov", MAX_FILE_SIZE_BYTES, {
        category: "PROJECT",
      }),
    ).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
    expect(
      validateUpload("records.zip", MAX_FILE_SIZE_BYTES, {
        category: "HONOR",
      }),
    ).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
  });

  it("rejects files above standard cap for original non-product material categories", () => {
    expect(
      validateUpload("paper-scan.jpg", MAX_FILE_SIZE_BYTES + 1, {
        category: "PAPER",
      }),
    ).toEqual({
      valid: false,
      reason: "FILE_TOO_LARGE",
    });
  });

  it("rejects supplement category files above the standard cap", () => {
    expect(
      validateUpload("statement.pdf", MAX_FILE_SIZE_BYTES + 1, {
        category: "EMPLOYMENT",
      }),
    ).toEqual({
      valid: false,
      reason: "FILE_TOO_LARGE",
    });
  });

  it("rejects unsupported file types on resume path", () => {
    expect(validateUpload("resume.exe", 1024)).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
    expect(validateUpload("resume.js", 1024)).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
    expect(validateUpload("resume.jsp", 1024)).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
    expect(validateUpload("resume.php", 1024)).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
  });

  it("rejects removed legacy document and archive formats", () => {
    expect(validateUpload("materials.doc", 1024)).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
    expect(validateUpload("materials.zip", 1024)).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
    expect(validateUpload("materials.rar", 1024)).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
  });

  it("accepts product category files within size cap when they match the shared allowlist", () => {
    expect(
      validateUpload("demo.gif", MAX_PRODUCT_MATERIAL_BYTES, {
        category: "PRODUCT",
      }),
    ).toEqual({ valid: true });
  });

  it("rejects product files outside the shared allowlist", () => {
    expect(
      validateUpload("demo.bin", MAX_PRODUCT_MATERIAL_BYTES, {
        category: "PRODUCT",
      }),
    ).toEqual({
      valid: false,
      reason: "UNSUPPORTED_FILE_TYPE",
    });
  });

  it("rejects product files above 300MB", () => {
    expect(
      validateUpload("large.gif", MAX_PRODUCT_MATERIAL_BYTES + 1, {
        category: "PRODUCT",
      }),
    ).toEqual({
      valid: false,
      reason: "FILE_TOO_LARGE",
    });
  });
});
