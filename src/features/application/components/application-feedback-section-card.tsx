"use client";

import { Clock3, PencilLine, Send } from "lucide-react";

import { SectionCard, StatusBanner, getInputClassName } from "@/components/ui/page-shell";
import {
  formatFeedbackTimestamp,
  useApplicationFeedback,
} from "@/features/application/components/use-application-feedback";
import { cn } from "@/lib/utils";

type ApplicationFeedbackSectionCardProps = {
  readonly applicationId: string;
  readonly flowName: string;
  readonly flowStep: string;
  readonly surface: string;
  readonly introText?: string;
  readonly title?: string;
  readonly description?: string;
  readonly helperText: string;
  readonly className?: string;
  readonly showAutosaveHint?: boolean;
  readonly sendButtonClassName?: string;
};

export function ApplicationFeedbackSectionCard({
  applicationId,
  flowName,
  flowStep,
  surface,
  introText,
  title,
  description,
  helperText,
  className,
  showAutosaveHint = true,
  sendButtonClassName,
}: ApplicationFeedbackSectionCardProps) {
  const {
    canSendFeedback,
    commentTooLong,
    draftError,
    feedback,
    hasFeedbackContent,
    handleSubmit,
    isLoading,
    isReady,
    isSubmitting,
    saveState,
    setFeedback,
    setSubmitError,
    submitError,
  } = useApplicationFeedback({
    applicationId,
    flowName,
    flowStep,
    surface,
    isEnabled: true,
  });

  return (
    <SectionCard
      title={feedback.status === "SUBMITTED" ? "Thanks for your feedback." : title}
      description={
        feedback.status === "SUBMITTED"
          ? "Your feedback was sent and will help us improve this experience."
          : description
      }
      className={cn(
        "border-[color:var(--border)] bg-white shadow-none",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        {feedback.status !== "SUBMITTED" && introText ? (
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
            {introText}
          </p>
        ) : null}

        {draftError && !isReady ? (
          <StatusBanner
            tone="neutral"
            title="Feedback is temporarily unavailable"
            description={draftError}
          />
        ) : null}

        {isLoading ? (
          <StatusBanner
            tone="loading"
            title="Loading feedback"
            description="Restoring your saved feedback details."
          />
        ) : null}

        {!isLoading && !isReady ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/35 p-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
            Feedback will become available again after you refresh the page.
          </div>
        ) : null}

        {!isLoading && isReady && feedback.status === "SUBMITTED" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950">
              Thanks - your feedback was sent.
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4">
              <div className="flex items-center gap-2">
                <Clock3
                  className="h-4 w-4 text-[color:var(--primary)]"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-[color:var(--primary)]">
                  Sent
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                {formatFeedbackTimestamp(feedback.submittedAt) ??
                  "Your feedback was submitted successfully."}
              </p>
            </div>
            {feedback.comment ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4">
                <div className="flex items-center gap-2">
                  <PencilLine
                    className="h-4 w-4 text-[color:var(--primary)]"
                    aria-hidden
                  />
                  <p className="text-sm font-semibold text-[color:var(--primary)]">
                    Your comment
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[color:var(--foreground-soft)]">
                  {feedback.comment}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isLoading && isReady && feedback.status !== "SUBMITTED" ? (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {submitError ? (
              <StatusBanner
                tone="danger"
                title="Feedback couldn't be sent"
                description={submitError}
              />
            ) : null}

            {draftError && saveState === "error" ? (
              <StatusBanner
                tone="neutral"
                title="Draft couldn't be saved"
                description="Draft couldn't be saved, but you can still send your feedback."
              />
            ) : null}

            {showAutosaveHint ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/15 p-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
                <div className="flex items-center gap-2 font-semibold text-[color:var(--primary)]">
                  <Clock3 className="size-4" aria-hidden />
                  {saveState === "saving"
                    ? "Saving your draft..."
                    : saveState === "saved"
                      ? "Draft saved."
                      : "Your draft saves automatically while you type."}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <label className="sr-only" htmlFor={`${surface}-feedback-comment`}>
                Feedback comment
              </label>
              <textarea
                id={`${surface}-feedback-comment`}
                className={getInputClassName(
                  cn(
                    "min-h-[120px] resize-y",
                    commentTooLong &&
                      "border-rose-400 focus-visible:ring-rose-200",
                  ),
                )}
                value={feedback.comment}
                onChange={(event) => {
                  setSubmitError(null);
                  setFeedback((current) => ({
                    ...current,
                    comment: event.target.value,
                  }));
                }}
                aria-invalid={commentTooLong}
                aria-describedby={
                  commentTooLong ? `${surface}-feedback-comment-too-long` : undefined
                }
                disabled={isSubmitting}
              />
              {commentTooLong ? (
                <p
                  id={`${surface}-feedback-comment-too-long`}
                  className="text-sm font-medium text-rose-700"
                >
                  Please shorten your comment to 2,000 characters or fewer.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="submit"
                className={cn(
                  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto",
                  sendButtonClassName ??
                    "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-900 focus-visible:ring-zinc-400",
                )}
                disabled={!canSendFeedback}
              >
                <Send className="h-4 w-4" aria-hidden />
                {isSubmitting ? "Sending..." : "Send feedback"}
              </button>
              <p className="pt-1 text-sm leading-6 text-[color:var(--foreground-soft)]">
                {hasFeedbackContent ? helperText : "Write a comment to send feedback."}
              </p>
            </div>
          </form>
        ) : null}
      </div>
    </SectionCard>
  );
}
