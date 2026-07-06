export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
] as const;

export const ALLOWED_DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.join(",");
export const ALLOWED_DOCUMENT_FORMATS_LABEL =
  "PDF, DOCX, and image files (PNG, JPG, JPEG, WEBP, GIF)";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_PRODUCT_MATERIAL_BYTES = 300 * 1024 * 1024;
