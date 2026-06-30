import {
  createApplicationEventLog,
  findInvitationById,
  getApplicationById,
  getMaterialReviewRunById,
} from "@/lib/data/store";
import type { EmailSender } from "@/lib/email/transport";
import { createEmailSenderFromEnv } from "@/lib/email/transport";
import { buildInitialMaterialReviewReportPayload } from "@/lib/initial-material-review-report-email/build-payload";
import {
  INITIAL_MATERIAL_REVIEW_REPORT_EMAIL_SUBJECT,
  INITIAL_MATERIAL_REVIEW_REPORT_EVENT_TYPES,
  INITIAL_MATERIAL_REVIEW_REPORT_MAX_ATTEMPTS,
  INITIAL_MATERIAL_REVIEW_REPORT_RETRY_BASE_DELAY_MS,
} from "@/lib/initial-material-review-report-email/constants";
import { renderInitialMaterialReviewReportEmail } from "@/lib/initial-material-review-report-email/render";
import { resolveReportEmailRecipient } from "@/lib/initial-material-review-report-email/resolve-recipient";
import {
  createInitialMaterialReviewReportEmail,
  getInitialMaterialReviewReportEmailByApplicationId,
  updateInitialMaterialReviewReportEmail,
} from "@/lib/initial-material-review-report-email/store";

export type TrySendInitialMaterialReviewReportEmailInput = {
  applicationId: string;
  reviewRunId: string;
  sender?: EmailSender;
  now?: Date;
};

function computeNextRetryAt(attemptCount: number, now: Date) {
  return new Date(
    now.getTime() +
      INITIAL_MATERIAL_REVIEW_REPORT_RETRY_BASE_DELAY_MS * attemptCount,
  );
}

async function resolveDefaultSender(sender?: EmailSender) {
  return sender ?? createEmailSenderFromEnv();
}

export async function trySendInitialMaterialReviewReportEmail(
  input: TrySendInitialMaterialReviewReportEmailInput,
): Promise<"sent" | "skipped" | "already_sent" | "not_eligible" | "retry_later"> {
  const now = input.now ?? new Date();
  const reviewRun = await getMaterialReviewRunById(input.reviewRunId);

  if (
    !reviewRun ||
    reviewRun.applicationId !== input.applicationId ||
    reviewRun.runNo !== 1 ||
    reviewRun.triggerType !== "INITIAL_SUBMISSION" ||
    reviewRun.status !== "COMPLETED"
  ) {
    return "not_eligible";
  }

  const application = await getApplicationById(input.applicationId);

  if (!application || application.eligibilityResult !== "ELIGIBLE") {
    return "not_eligible";
  }

  const existing = await getInitialMaterialReviewReportEmailByApplicationId(
    input.applicationId,
  );

  if (existing?.status === "SENT") {
    return "already_sent";
  }

  if (
    existing &&
    existing.status === "FAILED" &&
    existing.attemptCount >= INITIAL_MATERIAL_REVIEW_REPORT_MAX_ATTEMPTS
  ) {
    return "retry_later";
  }

  if (
    existing?.nextRetryAt &&
    existing.nextRetryAt.getTime() > now.getTime()
  ) {
    return "retry_later";
  }

  const invitation = await findInvitationById(application.invitationId);
  const recipient = resolveReportEmailRecipient({
    invitationEmail: invitation?.email,
    screeningContactEmail: application.screeningContactEmail,
    screeningWorkEmail: application.screeningWorkEmail,
  });

  if (!recipient) {
    await createApplicationEventLog({
      applicationId: input.applicationId,
      eventType:
        INITIAL_MATERIAL_REVIEW_REPORT_EVENT_TYPES.SKIPPED_NO_RECIPIENT,
      eventStatus: "FAIL",
      eventPayload: {
        reviewRunId: input.reviewRunId,
      },
    });
    return "skipped";
  }

  const reportPayload = await buildInitialMaterialReviewReportPayload({
    applicationId: input.applicationId,
  });
  const rendered = renderInitialMaterialReviewReportEmail(
    reportPayload,
    application.screeningPassportFullName,
  );

  const record =
    existing ??
    (await createInitialMaterialReviewReportEmail({
      applicationId: input.applicationId,
      reviewRunId: input.reviewRunId,
      recipientEmail: recipient,
      subject: INITIAL_MATERIAL_REVIEW_REPORT_EMAIL_SUBJECT,
      reportPayload,
      inviteTokenAvailable: reportPayload.inviteTokenAvailable ?? false,
    }));

  if (existing) {
    await updateInitialMaterialReviewReportEmail(input.applicationId, {
      recipientEmail: recipient,
      subject: INITIAL_MATERIAL_REVIEW_REPORT_EMAIL_SUBJECT,
      reportPayload,
      inviteTokenAvailable: reportPayload.inviteTokenAvailable ?? false,
    });
  }

  const sender = await resolveDefaultSender(input.sender);
  const nextAttemptCount = (record.attemptCount ?? 0) + 1;

  try {
    const sendResult = await sender.send({
      to: recipient,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });

    await updateInitialMaterialReviewReportEmail(input.applicationId, {
      status: "SENT",
      attemptCount: nextAttemptCount,
      lastAttemptAt: now,
      nextRetryAt: null,
      errorMessage: null,
      providerMessageId: sendResult.messageId,
      sentAt: now,
    });

    return "sent";
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send report email.";
    const isPermanentFailure =
      nextAttemptCount >= INITIAL_MATERIAL_REVIEW_REPORT_MAX_ATTEMPTS;

    await updateInitialMaterialReviewReportEmail(input.applicationId, {
      status: "FAILED",
      attemptCount: nextAttemptCount,
      lastAttemptAt: now,
      nextRetryAt: isPermanentFailure
        ? null
        : computeNextRetryAt(nextAttemptCount, now),
      errorMessage,
      providerMessageId: null,
    });

    if (isPermanentFailure) {
      await createApplicationEventLog({
        applicationId: input.applicationId,
        eventType:
          INITIAL_MATERIAL_REVIEW_REPORT_EVENT_TYPES.PERMANENT_FAILURE,
        eventStatus: "FAIL",
        errorMessage,
        eventPayload: {
          reviewRunId: input.reviewRunId,
          attemptCount: nextAttemptCount,
        },
      });
    }

    throw error;
  }
}
