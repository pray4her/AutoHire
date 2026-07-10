import type { MaterialCategory } from "@/features/application/types";
import { MATERIAL_ARCHIVE_FOLDERS } from "@/lib/ops-expert-files/constants";

export type InventoryFileSource = "resume" | "initial" | "supplement" | "extraction" | "secondary";

export type InventoryFile = {
  id: string;
  source: InventoryFileSource;
  category: MaterialCategory | "RESUME" | "EXTRACTION" | "SECONDARY" | null;
  fileName: string;
  objectKey: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string | null;
  archivePath: string;
};

export type ExpertFileInventory = {
  applicationId: string;
  customerNo: string;
  files: InventoryFile[];
  totalBytes: number;
  folderSummaries: Array<{
    folder: string;
    fileCount: number;
  }>;
  hasExtractionExport: boolean;
  hasSecondaryExport: boolean;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"|?*\u0000-\u001f\\/]/g, "_");
}

function uniqueArchiveName(
  used: Set<string>,
  folderPath: string,
  preferredName: string,
) {
  let candidate = `${folderPath}/${preferredName}`;
  if (!used.has(candidate)) {
    used.add(candidate);
    return preferredName;
  }

  const dot = preferredName.lastIndexOf(".");
  const base = dot > 0 ? preferredName.slice(0, dot) : preferredName;
  const ext = dot > 0 ? preferredName.slice(dot) : "";
  let index = 2;

  while (used.has(`${folderPath}/${base}__${index}${ext}`)) {
    index += 1;
  }

  const next = `${base}__${index}${ext}`;
  used.add(`${folderPath}/${next}`);
  return next;
}

function folderForCategory(category: MaterialCategory | "RESUME") {
  if (category === "RESUME") {
    return MATERIAL_ARCHIVE_FOLDERS.find((item) => item.key === "resume")!.folder;
  }

  if (category === "PRODUCT") {
    return null;
  }

  return (
    MATERIAL_ARCHIVE_FOLDERS.find((item) =>
      (item.categories as readonly string[]).includes(category),
    )?.folder ?? null
  );
}

export function buildArchivePathsForFiles(input: {
  customerNo: string;
  resume?: {
    id: string;
    fileName: string;
    objectKey: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date | null;
  } | null;
  materials: Array<{
    id: string;
    category: MaterialCategory;
    fileName: string;
    objectKey: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date | null;
  }>;
  supplements: Array<{
    id: string;
    category: MaterialCategory;
    fileName: string;
    objectKey: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date | null;
    uploadBatchId: string;
  }>;
  extraction?: {
    id: string;
    objectKey: string;
    fileSize: number | null;
    exportedAt: Date | null;
  } | null;
  secondary?: {
    id: string;
    objectKey: string;
    fileName: string | null;
    contentType: string | null;
    fileSize: number | null;
  } | null;
}): ExpertFileInventory {
  const used = new Set<string>();
  const files: InventoryFile[] = [];
  const root = input.customerNo;
  const materialsRoot = `${root}/materials`;

  if (input.resume) {
    const folder = folderForCategory("RESUME")!;
    const folderPath = `${materialsRoot}/${folder}`;
    const archiveName = uniqueArchiveName(
      used,
      folderPath,
      sanitizeFileName(input.resume.fileName),
    );
    files.push({
      id: input.resume.id,
      source: "resume",
      category: "RESUME",
      fileName: input.resume.fileName,
      objectKey: input.resume.objectKey,
      fileType: input.resume.fileType,
      fileSize: input.resume.fileSize,
      uploadedAt: input.resume.uploadedAt?.toISOString() ?? null,
      archivePath: `${folderPath}/${archiveName}`,
    });
  }

  for (const material of input.materials) {
    const folder = folderForCategory(material.category);
    if (!folder) {
      continue;
    }
    const folderPath = `${materialsRoot}/${folder}`;
    const preferred = `initial_${sanitizeFileName(material.fileName)}`;
    const archiveName = uniqueArchiveName(used, folderPath, preferred);
    files.push({
      id: material.id,
      source: "initial",
      category: material.category,
      fileName: material.fileName,
      objectKey: material.objectKey,
      fileType: material.fileType,
      fileSize: material.fileSize,
      uploadedAt: material.uploadedAt?.toISOString() ?? null,
      archivePath: `${folderPath}/${archiveName}`,
    });
  }

  for (const supplement of input.supplements) {
    const folder = folderForCategory(supplement.category);
    if (!folder) {
      continue;
    }
    const folderPath = `${materialsRoot}/${folder}`;
    const batchShort = supplement.uploadBatchId.slice(-6);
    const preferred = `supplement_${batchShort}_${sanitizeFileName(supplement.fileName)}`;
    const archiveName = uniqueArchiveName(used, folderPath, preferred);
    files.push({
      id: supplement.id,
      source: "supplement",
      category: supplement.category,
      fileName: supplement.fileName,
      objectKey: supplement.objectKey,
      fileType: supplement.fileType,
      fileSize: supplement.fileSize,
      uploadedAt: supplement.uploadedAt?.toISOString() ?? null,
      archivePath: `${folderPath}/${archiveName}`,
    });
  }

  if (input.extraction) {
    const archivePath = `${root}/抽取结果.xlsx`;
    used.add(archivePath);
    files.push({
      id: input.extraction.id,
      source: "extraction",
      category: "EXTRACTION",
      fileName: "抽取结果.xlsx",
      objectKey: input.extraction.objectKey,
      fileType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileSize: input.extraction.fileSize ?? 0,
      uploadedAt: input.extraction.exportedAt?.toISOString() ?? null,
      archivePath,
    });
  }

  if (input.secondary?.objectKey) {
    const originalName = input.secondary.fileName ?? "secondary-export.xls";
    const extMatch = /\.[^.]+$/.exec(originalName);
    const ext = extMatch?.[0] ?? ".xls";
    const archiveName = `详细分析${ext}`;
    const archivePath = `${root}/${archiveName}`;
    used.add(archivePath);
    files.push({
      id: input.secondary.id,
      source: "secondary",
      category: "SECONDARY",
      fileName: originalName,
      objectKey: input.secondary.objectKey,
      fileType: input.secondary.contentType ?? "application/vnd.ms-excel",
      fileSize: input.secondary.fileSize ?? 0,
      uploadedAt: null,
      archivePath,
    });
  }

  const folderSummaries = MATERIAL_ARCHIVE_FOLDERS.map((item) => ({
    folder: item.folder,
    fileCount: files.filter((file) =>
      file.archivePath.includes(`/materials/${item.folder}/`),
    ).length,
  }));

  return {
    applicationId: "",
    customerNo: input.customerNo,
    files,
    totalBytes: files.reduce((sum, file) => sum + (file.fileSize || 0), 0),
    folderSummaries,
    hasExtractionExport: Boolean(input.extraction),
    hasSecondaryExport: Boolean(input.secondary?.objectKey),
  };
}

export function materialCategoryExcludedFromExport(category: MaterialCategory) {
  return category === "PRODUCT";
}
