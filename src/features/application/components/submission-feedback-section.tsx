"use client";

import { ApplicationFeedbackSectionCard } from "@/features/application/components/application-feedback-section-card";

const FEEDBACK_PROMPT =
  "We welcome any suggestions to help improve this experience.";

export function SubmissionFeedbackSection({
  applicationId,
}: {
  readonly applicationId: string;
}) {
  return (
    <ApplicationFeedbackSectionCard
      applicationId={applicationId}
      flowName="submission flow"
      flowStep="feedback"
      surface="completion_page"
      title="Help us improve this application flow"
      description={FEEDBACK_PROMPT}
      helperText="Your feedback will help us improve this application flow."
    />
  );
}
