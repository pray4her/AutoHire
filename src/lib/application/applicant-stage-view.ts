import { resolveRouteFromStatus } from "@/features/application/route";
import type { MissingField } from "@/features/analysis/types";
import type {
  ApplicationSnapshot,
  ApplicationStatus,
  MaterialSummary,
  UploadedFileSummary,
} from "@/features/application/types";
import { buildApplicationSnapshot } from "@/lib/data/store";

export type ApplicantUiPhase =
  | "intro"
  | "resume"
  | "review"
  | "materials"
  | "done";

export type ApplicantAllowedAction =
  | "confirm_intro"
  | "upload_resume"
  | "delete_resume"
  | "start_analyze"
  | "confirm_extraction"
  | "submit_supplemental_fields"
  | "start_secondary_analysis"
  | "enter_materials"
  | "upload_material"
  | "submit_application"
  | "submit_feedback";

export type ApplicantStageView = {
  applicationId: string;
  phase: ApplicantUiPhase;
  uiStatus: string;
  allowedActions: ApplicantAllowedAction[];
  nextPath: string;
  progressLabel?: string | null;
  latestResumeFile?: UploadedFileSummary | null;
  extractedFields?: Record<string, unknown> | null;
  displaySummary?: string | null;
  reasonText?: string | null;
  missingFields?: MissingField[];
  uploadedMaterialsSummary?: MaterialSummary;
  productInnovationDescription?: string | null;
  submittedAt?: string | null;
  invitationLinkExpiresAt?: string | null;
  screeningPassportFullName?: string | null;
  screeningContactEmail?: string | null;
  screeningWorkEmail?: string | null;
  screeningPhoneNumber?: string | null;
};

function mapPhase(status: ApplicationStatus): ApplicantUiPhase {
  if (status === "INIT") {
    return "intro";
  }

  if (status === "INTRO_VIEWED" || status === "CV_UPLOADED") {
    return "resume";
  }

  if (status === "MATERIALS_IN_PROGRESS") {
    return "materials";
  }

  if (status === "SUBMITTED") {
    return "done";
  }

  return "review";
}

function mapUiStatus(status: ApplicationStatus): string {
  switch (status) {
    case "INIT":
      return "intro";
    case "INTRO_VIEWED":
      return "ready_to_upload";
    case "CV_UPLOADED":
      return "resume_uploaded";
    case "CV_EXTRACTING":
      return "extracting";
    case "CV_EXTRACTION_REVIEW":
      return "confirm_extraction";
    case "CV_ANALYZING":
    case "REANALYZING":
      return "analyzing";
    case "INFO_REQUIRED":
      return "need_info";
    case "INELIGIBLE":
      return "ineligible";
    case "ELIGIBLE":
      return "eligible";
    case "SECONDARY_ANALYZING":
      return "secondary_analyzing";
    case "SECONDARY_REVIEW":
      return "secondary_review";
    case "SECONDARY_FAILED":
      return "secondary_failed";
    case "MATERIALS_IN_PROGRESS":
      return "materials_in_progress";
    case "SUBMITTED":
      return "submitted";
    default:
      return "unknown";
  }
}

function mapAllowedActions(
  status: ApplicationStatus,
): ApplicantAllowedAction[] {
  switch (status) {
    case "INIT":
      return ["confirm_intro"];
    case "INTRO_VIEWED":
      return ["upload_resume"];
    case "CV_UPLOADED":
      return ["upload_resume", "delete_resume", "start_analyze"];
    case "CV_EXTRACTION_REVIEW":
      return ["confirm_extraction"];
    case "INFO_REQUIRED":
      return ["submit_supplemental_fields"];
    case "ELIGIBLE":
      return ["start_secondary_analysis", "enter_materials"];
    case "SECONDARY_REVIEW":
      return ["enter_materials"];
    case "MATERIALS_IN_PROGRESS":
      return ["upload_material", "submit_application"];
    case "SUBMITTED":
      return ["submit_feedback"];
    case "INELIGIBLE":
      return ["submit_feedback"];
    default:
      return [];
  }
}

function mapProgressLabel(status: ApplicationStatus): string | null {
  switch (status) {
    case "CV_EXTRACTING":
      return "Extracting information from your CV…";
    case "CV_ANALYZING":
    case "REANALYZING":
      return "Analyzing your CV…";
    case "SECONDARY_ANALYZING":
      return "Running detailed analysis…";
    default:
      return null;
  }
}

function projectStageFields(
  snapshot: ApplicationSnapshot,
  phase: ApplicantUiPhase,
): Partial<ApplicantStageView> {
  if (phase === "intro") {
    return {
      invitationLinkExpiresAt: snapshot.invitationLinkExpiresAt,
    };
  }

  if (phase === "resume") {
    return {
      latestResumeFile: snapshot.latestResumeFile,
    };
  }

  if (phase === "materials") {
    return {
      uploadedMaterialsSummary: snapshot.uploadedMaterialsSummary,
      productInnovationDescription: snapshot.productInnovationDescription,
    };
  }

  if (phase === "done") {
    return {
      submittedAt: snapshot.submittedAt,
    };
  }

  // review phase
  const fields: Partial<ApplicantStageView> = {
    extractedFields:
      snapshot.latestExtractionReview?.extractedFields ??
      snapshot.latestResult?.extractedFields ??
      null,
    displaySummary: snapshot.latestResult?.displaySummary ?? null,
    reasonText: snapshot.latestResult?.reasonText ?? null,
    missingFields: snapshot.latestResult?.missingFields,
  };

  if (snapshot.applicationStatus === "INFO_REQUIRED") {
    fields.screeningPassportFullName = snapshot.screeningPassportFullName;
    fields.screeningContactEmail = snapshot.screeningContactEmail;
    fields.screeningWorkEmail = snapshot.screeningWorkEmail;
    fields.screeningPhoneNumber = snapshot.screeningPhoneNumber;
  }

  return fields;
}

export async function buildApplicantStageView(
  applicationId: string,
): Promise<ApplicantStageView | null> {
  const snapshot = await buildApplicationSnapshot(applicationId);

  if (!snapshot) {
    return null;
  }

  const status = snapshot.applicationStatus;
  const phase = mapPhase(status);

  return {
    applicationId: snapshot.applicationId,
    phase,
    uiStatus: mapUiStatus(status),
    allowedActions: mapAllowedActions(status),
    nextPath: resolveRouteFromStatus(status),
    progressLabel: mapProgressLabel(status),
    ...projectStageFields(snapshot, phase),
  };
}
