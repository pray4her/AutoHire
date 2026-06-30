import { SUPPORTED_SUPPLEMENT_CATEGORIES } from "@/features/material-supplement/constants";
import type { SupplementCategory } from "@/features/material-supplement/types";
import {
  findInvitationGenerationItemByInvitationId,
  getApplicationById,
  getLatestAnalysisResult,
  listLatestSupplementRequests,
  listMaterialCategoryReviews,
} from "@/lib/data/store";
import { getEnv } from "@/lib/env";
import { INITIAL_MATERIAL_REVIEW_ELIGIBILITY_HEADLINE } from "@/lib/initial-material-review-report-email/constants";
import type { InitialMaterialReviewReportPayload } from "@/lib/initial-material-review-report-email/types";
import {
  deriveSupplementCategoryState,
  isSupplementRequestPending,
} from "@/lib/material-supplement/status";

function mapCategoryOutcome(
  status: ReturnType<typeof deriveSupplementCategoryState>["status"],
): "COMPLETE" | "SUPPLEMENT_REQUIRED" {
  if (
    status === "SUPPLEMENT_REQUIRED" ||
    status === "PARTIALLY_SATISFIED"
  ) {
    return "SUPPLEMENT_REQUIRED";
  }

  return "COMPLETE";
}

function normalizeSuggestedMaterials(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function buildInitialMaterialReviewReportPayload(input: {
  applicationId: string;
}): Promise<InitialMaterialReviewReportPayload> {
  const application = await getApplicationById(input.applicationId);

  if (!application) {
    throw new Error("Application not found.");
  }

  const [
    latestAnalysisResult,
    latestCategoryReviews,
    latestSupplementRequests,
    generationItem,
  ] = await Promise.all([
    getLatestAnalysisResult(input.applicationId),
    listMaterialCategoryReviews(input.applicationId, { isLatest: true }),
    listLatestSupplementRequests(input.applicationId),
    findInvitationGenerationItemByInvitationId(application.invitationId),
  ]);

  const categorySummary = SUPPORTED_SUPPLEMENT_CATEGORIES.map((category) => {
    const latestReview =
      latestCategoryReviews.find((review) => review.category === category) ??
      null;
    const categoryRequests = latestSupplementRequests.filter(
      (request) => request.category === category,
    );
    const derived = deriveSupplementCategoryState({
      latestReview,
      latestRequests: categoryRequests,
    });

    return {
      category,
      outcome: mapCategoryOutcome(derived.status),
    };
  });

  const pendingRequests = latestSupplementRequests
    .filter(
      (request) =>
        request.isLatest &&
        !request.isSatisfied &&
        request.status === "PENDING" &&
        isSupplementRequestPending(request),
    )
    .map((request) => ({
      category: request.category as SupplementCategory,
      title: request.title,
      reason: request.reason ?? "",
      suggestedMaterials: normalizeSuggestedMaterials(
        request.suggestedMaterials,
      ),
      aiMessage: request.aiMessage,
    }));

  const inviteTokenAvailable = Boolean(generationItem?.plaintextToken);
  const supplementDeepLink = inviteTokenAvailable
    ? `${getEnv().APP_BASE_URL}/apply/supplement?t=${generationItem!.plaintextToken}`
    : null;

  return {
    eligibility: {
      headline: INITIAL_MATERIAL_REVIEW_ELIGIBILITY_HEADLINE,
      displaySummary: latestAnalysisResult?.displaySummary ?? null,
    },
    categorySummary,
    pendingRequests,
    inviteTokenAvailable,
    supplementDeepLink,
  };
}
