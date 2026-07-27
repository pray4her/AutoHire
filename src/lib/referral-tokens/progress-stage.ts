type ApplicationStatus =
  | "INIT" | "INTRO_VIEWED" | "CV_UPLOADED" | "CV_EXTRACTING"
  | "CV_EXTRACTION_REVIEW" | "CV_ANALYZING" | "INFO_REQUIRED" | "REANALYZING"
  | "INELIGIBLE" | "ELIGIBLE" | "SECONDARY_ANALYZING" | "SECONDARY_REVIEW"
  | "SECONDARY_FAILED" | "MATERIALS_IN_PROGRESS" | "SUBMITTED" | "CLOSED";

const PROGRESS_STAGE: Record<ApplicationStatus, string> = {
  INIT: "已注册未上传",
  INTRO_VIEWED: "已注册未上传",
  CV_UPLOADED: "简历中",
  CV_EXTRACTING: "简历中",
  CV_EXTRACTION_REVIEW: "简历中",
  CV_ANALYZING: "简历中",
  INFO_REQUIRED: "初审中",
  REANALYZING: "初审中",
  INELIGIBLE: "不合格",
  ELIGIBLE: "初审中",
  SECONDARY_ANALYZING: "材料中",
  SECONDARY_REVIEW: "材料中",
  SECONDARY_FAILED: "材料中",
  MATERIALS_IN_PROGRESS: "材料中",
  SUBMITTED: "已提交",
  CLOSED: "已关闭",
};

export function toReferralProgressStage(status: ApplicationStatus | string) {
  return PROGRESS_STAGE[status as ApplicationStatus] ?? "处理中";
}
