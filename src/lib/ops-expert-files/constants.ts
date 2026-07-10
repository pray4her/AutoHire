export const OPS_EXPORT_MAX_APPLICATIONS = 50;
export const OPS_EXPORT_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const OPS_EXPORT_ESTIMATE_TTL_SECONDS = 5 * 60;
export const OPS_EXPORT_LEASE_MS = 60 * 60 * 1000;
export const OPS_EXPORT_MAX_RUNNING_PER_OPERATOR = 1;
export const OPS_EXPORT_MAX_RUNNING_GLOBAL = 3;
export const OPS_EXPORT_DEFAULT_LOOKBACK_DAYS = 7;
export const OPS_EXPORT_OBJECT_PREFIX = "exports/ops";
export const OPS_EXPORT_TIME_ZONE = "Asia/Shanghai";
export const CUSTOMER_NO_MAX_DAILY_SEQ = 99;
export const CUSTOMER_NO_SUFFIX = "01";

export const MATERIAL_ARCHIVE_FOLDERS = [
  { key: "resume", folder: "0简历", categories: [] as const },
  {
    key: "IDENTITY",
    folder: "1基本信息",
    categories: ["IDENTITY"] as const,
  },
  {
    key: "EDUCATION",
    folder: "2学历证明",
    categories: ["EDUCATION"] as const,
  },
  {
    key: "EMPLOYMENT",
    folder: "3工作证明",
    categories: ["EMPLOYMENT"] as const,
  },
  {
    key: "PROJECT",
    folder: "4项目证明",
    categories: ["PROJECT"] as const,
  },
  {
    key: "PAPER",
    folder: "51论文",
    categories: ["PAPER"] as const,
  },
  {
    key: "BOOK",
    folder: "52著作",
    categories: ["BOOK"] as const,
  },
  {
    key: "PATENT",
    folder: "53专利",
    categories: ["PATENT"] as const,
  },
  {
    key: "CONFERENCE",
    folder: "54会议",
    categories: ["CONFERENCE"] as const,
  },
  {
    key: "HONOR",
    folder: "56荣誉",
    categories: ["HONOR"] as const,
  },
] as const;

export type MaterialArchiveFolder = (typeof MATERIAL_ARCHIVE_FOLDERS)[number];

export function buildOpsExportEntriesObjectKey(jobId: string) {
  return `${OPS_EXPORT_OBJECT_PREFIX}/${jobId}.entries.json`;
}

export function buildOpsExportZipObjectKey(jobId: string) {
  return `${OPS_EXPORT_OBJECT_PREFIX}/${jobId}.zip`;
}

export function buildOpsExportManifestObjectKey(
  jobId: string,
  kind: "export" | "expert",
  customerNo?: string,
) {
  if (kind === "export") {
    return `${OPS_EXPORT_OBJECT_PREFIX}/${jobId}/export-manifest.json`;
  }

  return `${OPS_EXPORT_OBJECT_PREFIX}/${jobId}/${customerNo}/manifest.json`;
}
