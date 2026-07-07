import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/page-shell";
import { ApplicationFeedbackSectionCard } from "@/features/application/components/application-feedback-section-card";
import {
  ELIGIBLE_ASSESSMENT_DOCUMENTS,
  ELIGIBLE_ASSESSMENT_FOOTNOTE,
  ELIGIBLE_ASSESSMENT_HEADING,
  ELIGIBLE_ASSESSMENT_INTRO,
  ELIGIBILITY_ASSESSMENT_ACCURACY_NOTE,
  INELIGIBLE_CLOSING_MESSAGE,
} from "@/features/application/constants";
import type { ApplicationSnapshot } from "@/features/application/types";
import { cn } from "@/lib/utils";

function formatIneligibleReasonDetails(
  displaySummary: string | null,
  reasonText: string | null,
) {
  const summary = displaySummary?.trim() ?? "";
  const reason = reasonText?.trim() ?? "";

  if (!summary && !reason) {
    return null;
  }

  if (!summary) {
    return reason;
  }

  if (!reason || summary === reason) {
    return summary;
  }

  return `${summary}\n\n${reason}`;
}

function EligibilityAssessmentAccuracyNote({
  className,
}: {
  readonly className?: string;
}) {
  return (
    <p
      className={cn(
        "text-sm leading-6 text-[color:var(--foreground-soft)]",
        className,
      )}
    >
      <span className="font-semibold text-[color:var(--foreground)]">Note:</span>{" "}
      {ELIGIBILITY_ASSESSMENT_ACCURACY_NOTE}
    </p>
  );
}

function IneligibleAssessmentResultBody({
  reasonDetails,
}: {
  readonly reasonDetails: string | null;
}) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[color:var(--foreground-soft)]">
          Status:
        </span>
        <Badge variant="destructive">Not eligible</Badge>
      </div>

      {reasonDetails ? (
        <p className="text-sm leading-6 whitespace-pre-wrap text-[color:var(--foreground-soft)]">
          {reasonDetails}
        </p>
      ) : null}

      <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
        {INELIGIBLE_CLOSING_MESSAGE}
      </p>
    </div>
  );
}

function EligibleAssessmentResultBody() {
  return (
    <div
      className="rounded-xl border border-emerald-200 bg-white px-4 py-4 sm:px-5 sm:py-5"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold leading-6 text-emerald-950">
        {ELIGIBLE_ASSESSMENT_HEADING}
      </p>
      <p className="mt-3 text-sm leading-6 text-emerald-950/90">
        {ELIGIBLE_ASSESSMENT_INTRO}
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-emerald-950/90">
        {ELIGIBLE_ASSESSMENT_DOCUMENTS.map((document) => (
          <li key={document}>{document}</li>
        ))}
      </ul>
      <p className="mt-4 text-xs italic leading-5 text-emerald-900/75">
        {ELIGIBLE_ASSESSMENT_FOOTNOTE}
      </p>
    </div>
  );
}

export function InitialCvReviewDeterminationCard({
  snapshot,
}: {
  readonly snapshot: ApplicationSnapshot;
}) {
  const latest = snapshot.latestResult;
  const displaySummary = latest?.displaySummary ?? null;
  const reasonText = latest?.reasonText ?? null;

  if (snapshot.eligibilityResult === "INELIGIBLE") {
    return (
      <>
        <SectionCard title="Preliminary assessment result">
          <div className="flex flex-col gap-4">
            <IneligibleAssessmentResultBody
              reasonDetails={formatIneligibleReasonDetails(
                displaySummary,
                reasonText,
              )}
            />
            <EligibilityAssessmentAccuracyNote />
          </div>
        </SectionCard>
        <ApplicationFeedbackSectionCard
          applicationId={snapshot.applicationId}
          flowName="resume review"
          flowStep="eligibility_result"
          surface="resume_ineligible"
          introText="We welcome any suggestions to help improve this experience."
          helperText="Write a comment to send feedback."
          className="w-full"
          showAutosaveHint={false}
          sendButtonClassName="border-zinc-300 bg-zinc-500 text-white hover:bg-zinc-600 focus-visible:ring-zinc-300"
        />
      </>
    );
  }

  if (
    snapshot.eligibilityResult === "INSUFFICIENT_INFO" ||
    snapshot.applicationStatus === "INFO_REQUIRED"
  ) {
    return null;
  }

  if (snapshot.eligibilityResult === "ELIGIBLE") {
    return (
      <SectionCard className="border-emerald-200 bg-emerald-50">
        <div className="flex flex-col gap-4">
          <EligibleAssessmentResultBody />
          <EligibilityAssessmentAccuracyNote className="text-emerald-950/85" />
        </div>
      </SectionCard>
    );
  }

  return null;
}
