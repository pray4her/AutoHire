"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ActionButton,
  PageFrame,
  PageShell,
  StatusBanner,
} from "@/components/ui/page-shell";
import { ApplyEntryProgramIntroduction } from "@/features/application/components/apply-entry-program-introduction";
import {
  APPLICATION_DEADLINE_PILL,
  INTRO_DESCRIPTION,
  APPLY_ENTRY_ACCORDION_SECTION_CLASS,
  type IntroSectionId,
} from "@/features/application/components/apply-entry-intro-content";
import {
  buildInviteNoticeStorageKey,
  hasSeenInviteNotice,
  rememberInviteNotice,
} from "@/features/application/components/apply-entry-client-storage";
import { ApplyEntryFooterNav } from "@/features/application/components/apply-entry-footer-nav";
import { ApplyInviteNoticeDialog } from "@/features/application/components/apply-invite-notice-dialog";
import { postIntroConfirm } from "@/features/application/client";
import { APPLICATION_FLOW_STEPS_WITH_INTRO } from "@/features/application/constants";
import {
  buildApplyFlowStepLinks,
  getReachableFlowStep,
  isFlowStepReadOnly,
} from "@/features/application/route";
import type { ApplicationSnapshot } from "@/features/application/types";
import { trackClick, trackPageView } from "@/lib/tracking/client";
import { usePageDurationTracking } from "@/lib/tracking/use-page-duration-tracking";

type ApplyEntryClientProps = {
  initialSnapshot: ApplicationSnapshot;
  openedFromInviteLink: boolean;
};

function formatInvitationLinkExpiration(value: string | null | undefined) {
  if (!value) {
    return "the date specified in your invitation email";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "the date specified in your invitation email";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
  }).format(date);
}

function toggleIntroSection(
  openSections: Set<IntroSectionId>,
  sectionId: IntroSectionId,
): Set<IntroSectionId> {
  const next = new Set(openSections);

  if (next.has(sectionId)) {
    next.delete(sectionId);
  } else {
    next.add(sectionId);
  }

  return next;
}

export function ApplyEntryClient({
  initialSnapshot,
  openedFromInviteLink,
}: ApplyEntryClientProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ApplicationSnapshot | null>(
    initialSnapshot,
  );
  const flowStepLinks = useMemo(
    () => buildApplyFlowStepLinks(snapshot?.applicationStatus),
    [snapshot?.applicationStatus],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openSections, setOpenSections] = useState<Set<IntroSectionId>>(
    () => new Set(["overview"]),
  );
  const [isInviteNoticeOpen, setIsInviteNoticeOpen] = useState(false);
  const hasTrackedPageView = useRef(false);

  usePageDurationTracking({
    pageName: "apply_entry",
    stepName: "intro",
    applicationId: snapshot?.applicationId,
  });

  useEffect(() => {
    if (!openedFromInviteLink || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (!url.searchParams.has("invite")) {
      return;
    }

    url.searchParams.delete("invite");
    const search = url.searchParams.toString();

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${search ? `?${search}` : ""}${url.hash}`,
    );
  }, [openedFromInviteLink]);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    if (hasTrackedPageView.current) {
      return;
    }

    if (!snapshot) {
      return;
    }

    hasTrackedPageView.current = true;
    void trackPageView({
      pageName: "apply_entry",
      stepName: "intro",
      applicationId: snapshot.applicationId,
    });
  }, [snapshot]);

  useEffect(() => {
    if (!openedFromInviteLink || !snapshot || error) {
      return;
    }

    const storageKey = buildInviteNoticeStorageKey(snapshot, null);

    if (!storageKey || hasSeenInviteNotice(storageKey)) {
      return;
    }

    setIsInviteNoticeOpen(true);
  }, [error, openedFromInviteLink, snapshot]);

  function handleStart() {
    if (!snapshot || isFlowStepReadOnly(snapshot.applicationStatus, 0)) {
      return;
    }

    startTransition(async () => {
      try {
        void trackClick({
          eventType: "start_apply_clicked",
          pageName: "apply_entry",
          stepName: "intro",
          applicationId: snapshot.applicationId,
        });
        await postIntroConfirm(snapshot.applicationId);
        router.push("/apply/resume");
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to open the CV upload page.",
        );
      }
    });
  }

  const isReadOnlyReview = snapshot
    ? isFlowStepReadOnly(snapshot.applicationStatus, 0)
    : false;
  const invitationExpirationLabel = formatInvitationLinkExpiration(
    snapshot?.invitationLinkExpiresAt,
  );

  function handleInviteNoticeOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      const storageKey = buildInviteNoticeStorageKey(snapshot, null);

      if (storageKey) {
        rememberInviteNotice(storageKey);
      }
    }

    setIsInviteNoticeOpen(nextOpen);
  }

  function handleInviteNoticeDismiss() {
    handleInviteNoticeOpenChange(false);
  }

  return (
    <PageFrame>
      <ApplyInviteNoticeDialog
        invitationExpirationLabel={invitationExpirationLabel}
        isOpen={isInviteNoticeOpen}
        onOpenChange={handleInviteNoticeOpenChange}
        onDismiss={handleInviteNoticeDismiss}
      />

      <PageShell
        title="Global Excellent Scientists Fund"
        description={INTRO_DESCRIPTION}
        headerTitleClassName="font-normal"
        headerVariant="centered"
        className="pb-0"
        steps={APPLICATION_FLOW_STEPS_WITH_INTRO}
        currentStep={0}
        stepIndexing="zero"
        stepLinks={flowStepLinks}
        maxAccessibleStep={
          snapshot ? getReachableFlowStep(snapshot.applicationStatus) : 0
        }
        headerSlot={
          <div className="flex justify-center">
            <span className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--primary)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,25,47,0.16)]">
              {APPLICATION_DEADLINE_PILL}
            </span>
          </div>
        }
      >
        <div className="mx-auto max-w-4xl space-y-4">
          {error ? (
            <StatusBanner
              tone="danger"
              title="Unable to open the application entry"
            >
              <p className="text-sm leading-6">{error}</p>
              <p className="text-xs text-[color:var(--foreground-soft)]">
                For local testing, you can use the sample token:
                <code className="ml-2 rounded-md bg-white px-2 py-1 text-[0.72rem] text-[color:var(--primary)]">
                  sample-init-token
                </code>
              </p>
            </StatusBanner>
          ) : null}

          <section
            className={APPLY_ENTRY_ACCORDION_SECTION_CLASS}
            aria-label="Application information"
          >
            <ApplyEntryProgramIntroduction
              openSections={openSections}
              onToggleSection={(sectionId) => {
                setOpenSections((currentOpenSections) =>
                  toggleIntroSection(currentOpenSections, sectionId),
                );
              }}
            />
          </section>

          <div className="flex justify-center py-4">
            <ActionButton
              onClick={handleStart}
              disabled={isPending || isReadOnlyReview}
            >
              <span>
                {isPending ? "Opening..." : "Continue to CV Submission"}
              </span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </ActionButton>
          </div>
        </div>
      </PageShell>

      <ApplyEntryFooterNav />
    </PageFrame>
  );
}
