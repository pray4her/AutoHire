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
  INELIGIBLE_INTRO_MESSAGE,
  INELIGIBLE_MANUAL_REVIEW_HEADING,
  INELIGIBLE_MANUAL_REVIEW_MESSAGE,
  INELIGIBLE_REASON_HEADING,
} from "@/features/application/constants";
import type { ApplicationSnapshot } from "@/features/application/types";
import { cn } from "@/lib/utils";

function resolveIneligibleReasonText(reasonText: string | null) {
  const reason = reasonText?.trim() ?? "";

  if (!reason) {
    return null;
  }

  const marker = INELIGIBLE_REASON_HEADING.toLowerCase();

  if (reason.toLowerCase().startsWith(marker)) {
    const body = reason.slice(INELIGIBLE_REASON_HEADING.length).trim();
    return body || null;
  }

  return reason;
}

/** Renders applicant-facing reason copy, preserving `**bold**` emphasis from the model. */
function IneligibleReasonBodyText({ text }: { readonly text: string }) {
  const segments = text.split(/(\*\*[^*]+?\*\*)/g);

  return (
    <p className="text-sm leading-6 whitespace-pre-wrap text-[color:var(--foreground-soft)]">
      {segments.map((segment, index) => {
        const boldMatch = /^\*\*([^*]+)\*\*$/.exec(segment);

        if (boldMatch) {
          return (
            <strong
              key={`bold-${index}`}
              className="font-semibold text-[color:var(--foreground)]"
            >
              {boldMatch[1]}
            </strong>
          );
        }

        return <span key={`text-${index}`}>{segment}</span>;
      })}
    </p>
  );
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

function IneligibleManualReviewNote() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold leading-6 text-[color:var(--foreground)]">
        {INELIGIBLE_MANUAL_REVIEW_HEADING}
      </p>
      <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
        {INELIGIBLE_MANUAL_REVIEW_MESSAGE}
      </p>
    </div>
  );
}

function IneligibleAssessmentResultBody({
  reasonText,
}: {
  readonly reasonText: string | null;
}) {
  const reasonDetails = resolveIneligibleReasonText(reasonText);

  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[color:var(--foreground-soft)]">
          Status:
        </span>
        <Badge variant="destructive">Not Eligible</Badge>
      </div>

      <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
        {INELIGIBLE_INTRO_MESSAGE}
      </p>

      {reasonDetails ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold leading-6 text-[color:var(--foreground)]">
            {INELIGIBLE_REASON_HEADING}
          </p>
          <IneligibleReasonBodyText text={reasonDetails} />
        </div>
      ) : null}

      <IneligibleManualReviewNote />

      <p className="text-sm font-semibold leading-6 text-[color:var(--foreground)]">
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
  const reasonText = latest?.reasonText ?? null;

  if (snapshot.eligibilityResult === "INELIGIBLE") {
    return (
      <>
        <SectionCard title="Preliminary Assessment Result">
          <IneligibleAssessmentResultBody reasonText={reasonText} />
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
