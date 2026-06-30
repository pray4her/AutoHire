export type InitialMaterialReviewReportEmailStatus =
  | "PENDING"
  | "SENT"
  | "FAILED";

export type InitialMaterialReviewReportPayload = {
  eligibility?: {
    headline: string;
    displaySummary?: string | null;
  };
  categorySummary: Array<{
    category: string;
    outcome: "COMPLETE" | "SUPPLEMENT_REQUIRED";
  }>;
  pendingRequests: Array<{
    category: string;
    title: string;
    reason: string;
    suggestedMaterials: string[];
    aiMessage?: string | null;
  }>;
  inviteTokenAvailable?: boolean;
  supplementDeepLink?: string | null;
};

export type InitialMaterialReviewReportEmailRecord = {
  id: string;
  applicationId: string;
  reviewRunId: string;
  recipientEmail: string;
  subject: string;
  reportPayload: InitialMaterialReviewReportPayload;
  status: InitialMaterialReviewReportEmailStatus;
  attemptCount: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  errorMessage: string | null;
  providerMessageId: string | null;
  sentAt: Date | null;
  inviteTokenAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
};
