import { describe, expect, it } from "vitest";

import {
  ALLOWED_DOCUMENT_ACCEPT,
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_DOCUMENT_FORMATS_LABEL,
} from "@/features/upload/constants";

describe("upload constants", () => {
  it("exposes the unified candidate upload allowlist", () => {
    expect(ALLOWED_DOCUMENT_EXTENSIONS).toEqual([
      ".pdf",
      ".docx",
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
    ]);
    expect(ALLOWED_DOCUMENT_ACCEPT).toBe(
      ".pdf,.docx,.png,.jpg,.jpeg,.webp,.gif",
    );
  });

  it("describes the supported upload formats for UI copy", () => {
    expect(ALLOWED_DOCUMENT_FORMATS_LABEL).toBe(
      "PDF, DOCX, and image files (PNG, JPG, JPEG, WEBP, GIF)",
    );
  });
});
