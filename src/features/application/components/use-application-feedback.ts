"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  fetchApplicationFeedbackAction,
  saveFeedbackDraftAction,
  submitFeedbackAction,
} from "@/features/application/actions";
import { APPLICATION_FEEDBACK_COMMENT_MAX_LENGTH } from "@/features/application/constants";
import type {
  ApplicationFeedbackContext,
  ApplicationFeedbackSnapshot,
} from "@/features/application/types";
import { getOrCreateTrackingSessionId } from "@/lib/tracking/client";

type UseApplicationFeedbackOptions = {
  readonly applicationId: string;
  readonly flowName: string;
  readonly flowStep: string;
  readonly surface: string;
  readonly isEnabled: boolean;
};

const DEFAULT_FEEDBACK: ApplicationFeedbackSnapshot = {
  status: "DRAFT",
  rating: null,
  comment: "",
  draftSavedAt: null,
  submittedAt: null,
};

function serializeFeedbackDraft(feedback: ApplicationFeedbackSnapshot) {
  return JSON.stringify({
    rating: feedback.rating,
    comment: feedback.comment.trim(),
  });
}

function buildFeedbackContext(input: {
  flowName: string;
  flowStep: string;
  surface: string;
}): ApplicationFeedbackContext {
  if (typeof window === "undefined") {
    return {
      flowName: input.flowName,
      flowStep: input.flowStep,
      deviceType: "unknown",
      isLoggedIn: false,
      surface: input.surface,
    };
  }

  const viewportWidth = window.innerWidth;

  return {
    currentUrl: window.location.href,
    pageTitle: document.title,
    flowName: input.flowName,
    flowStep: input.flowStep,
    browserInfo: navigator.userAgent,
    deviceType:
      viewportWidth < 768
        ? "mobile"
        : viewportWidth < 1024
          ? "tablet"
          : "desktop",
    viewportWidth,
    viewportHeight: window.innerHeight,
    isLoggedIn: false,
    userId: null,
    surface: input.surface,
  };
}

export function formatFeedbackTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function useApplicationFeedback({
  applicationId,
  flowName,
  flowStep,
  surface,
  isEnabled,
}: UseApplicationFeedbackOptions) {
  const [feedback, setFeedback] =
    useState<ApplicationFeedbackSnapshot>(DEFAULT_FEEDBACK);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveState, setSaveState] =
    useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastPersistedFeedbackRef = useRef(
    serializeFeedbackDraft(DEFAULT_FEEDBACK),
  );

  const commentTooLong =
    feedback.comment.length > APPLICATION_FEEDBACK_COMMENT_MAX_LENGTH;
  const hasFeedbackContent = feedback.comment.trim().length > 0;
  const canSendFeedback =
    isReady && hasFeedbackContent && !commentTooLong && !isSubmitting;

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let active = true;
    setIsLoading(true);

    void fetchApplicationFeedbackAction(applicationId)
      .then((nextFeedback) => {
        if (!active) {
          return;
        }

        setFeedback(nextFeedback);
        lastPersistedFeedbackRef.current = serializeFeedbackDraft(nextFeedback);
        setDraftError(null);
        setIsReady(true);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setDraftError(
          error instanceof Error
            ? error.message
            : "Feedback is temporarily unavailable.",
        );
        setIsReady(false);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [applicationId, isEnabled]);

  useEffect(() => {
    if (
      !isEnabled ||
      !isReady ||
      feedback.status === "SUBMITTED" ||
      isSubmitting ||
      commentTooLong
    ) {
      return;
    }

    const serialized = serializeFeedbackDraft(feedback);

    if (serialized === lastPersistedFeedbackRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        setDraftError(null);

        const saved = await saveFeedbackDraftAction(
          applicationId,
          {
            comment: feedback.comment,
            context: buildFeedbackContext({ flowName, flowStep, surface }),
          },
          getOrCreateTrackingSessionId(),
        );

        lastPersistedFeedbackRef.current = serializeFeedbackDraft(saved);
        setFeedback(saved);
        setSaveState("saved");
      } catch (error) {
        setSaveState("error");
        setDraftError(
          error instanceof Error
            ? error.message
            : "Draft couldn't be saved. Please copy your comment before leaving.",
        );
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    applicationId,
    commentTooLong,
    feedback,
    flowName,
    flowStep,
    isEnabled,
    isReady,
    isSubmitting,
    surface,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSendFeedback) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const submitted = await submitFeedbackAction(
        applicationId,
        {
          comment: feedback.comment,
          context: buildFeedbackContext({ flowName, flowStep, surface }),
        },
        getOrCreateTrackingSessionId(),
      );

      lastPersistedFeedbackRef.current = serializeFeedbackDraft(submitted);
      setFeedback(submitted);
      setSaveState("idle");
      setDraftError(null);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Feedback couldn't be sent. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
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
  };
}
