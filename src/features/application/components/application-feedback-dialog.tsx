"use client";

import { useState } from "react";
import { Clock3, MessageSquarePlus, PencilLine, Send } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  StatusBanner,
  getButtonClassName,
  getInputClassName,
} from "@/components/ui/page-shell";
import {
  formatFeedbackTimestamp,
  useApplicationFeedback,
} from "@/features/application/components/use-application-feedback";
import { cn } from "@/lib/utils";

type ApplicationFeedbackDialogProps = {
  readonly applicationId: string;
  readonly flowName: string;
  readonly flowStep: string;
  readonly surface: string;
  readonly triggerLabel?: string;
  readonly submittedTriggerLabel?: string;
  readonly title?: string;
  readonly description?: string;
  readonly triggerClassName?: string;
};

export function ApplicationFeedbackDialog({
  applicationId,
  flowName,
  flowStep,
  surface,
  triggerLabel = "Fill feedback",
  submittedTriggerLabel = "View feedback",
  title = "Share your feedback",
  description = "We welcome any suggestions to help improve this experience.",
  triggerClassName,
}: ApplicationFeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    isEnabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        className={cn(
          getButtonClassName(
            feedback.status === "SUBMITTED" ? "secondary" : "primary",
          ),
          "min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold",
          triggerClassName,
        )}
      >
        <MessageSquarePlus className="size-4 shrink-0" aria-hidden />
        {feedback.status === "SUBMITTED" ? submittedTriggerLabel : triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
          {isLoading ? (
            <StatusBanner
              tone="loading"
              title="Loading feedback"
              description="Restoring your saved feedback details."
            />
          ) : null}

          {draftError && !isReady ? (
            <StatusBanner
              tone="neutral"
              title="Feedback is temporarily unavailable"
              description={draftError}
            />
          ) : null}

          {!isLoading && isReady && feedback.status === "SUBMITTED" ? (
            <div className="flex flex-col gap-4">
              <StatusBanner
                tone="success"
                title="Thanks for your feedback"
                description={
                  formatFeedbackTimestamp(feedback.submittedAt) ??
                  "Your feedback was submitted successfully."
                }
              />
              {feedback.comment ? (
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--primary)]">
                    <PencilLine className="size-4" aria-hidden />
                    Your comment
                  </div>
                  <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[color:var(--foreground-soft)]">
                    {feedback.comment}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {!isLoading && isReady && feedback.status !== "SUBMITTED" ? (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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

              <div className="flex flex-col gap-2">
                <label className="sr-only" htmlFor="feedback-comment">
                  Feedback comment
                </label>
                <textarea
                  id="feedback-comment"
                  className={getInputClassName(
                    cn(
                      "min-h-[160px] resize-y",
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
                    commentTooLong ? "feedback-comment-too-long" : undefined
                  }
                  disabled={isSubmitting}
                />
                {commentTooLong ? (
                  <p
                    id="feedback-comment-too-long"
                    className="text-sm font-medium text-rose-700"
                  >
                    Please shorten your comment to 2,000 characters or fewer.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                  {hasFeedbackContent
                    ? "Your feedback will help us improve this step."
                    : "Write a comment to send feedback."}
                </p>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={!canSendFeedback}
                >
                  <Send className="size-4" aria-hidden />
                  {isSubmitting ? "Sending..." : "Send feedback"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
