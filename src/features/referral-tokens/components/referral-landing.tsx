"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ActionButton,
  PageFrame,
  PageShell,
  StatusBanner,
} from "@/components/ui/page-shell";
import {
  buildInviteNoticeStorageKey,
  hasSeenInviteNotice,
  rememberInviteNotice,
} from "@/features/application/components/apply-entry-client-storage";
import { ApplyEntryFooterNav } from "@/features/application/components/apply-entry-footer-nav";
import {
  APPLICATION_DEADLINE_PILL,
  APPLY_ENTRY_ACCORDION_SECTION_CLASS,
  INTRO_DESCRIPTION,
  type IntroSectionId,
} from "@/features/application/components/apply-entry-intro-content";
import { ApplyEntryProgramIntroduction } from "@/features/application/components/apply-entry-program-introduction";
import { ApplyInviteNoticeDialog } from "@/features/application/components/apply-invite-notice-dialog";
import { APPLICATION_FLOW_STEPS_WITH_INTRO } from "@/features/application/constants";
import type { PublicReferralResult } from "@/lib/referral-tokens/public-service";

/**
 * Referral links land on the same entry shell as the invitation /apply page:
 * program introduction, the Important Notice dialog and a single "Continue to
 * CV Submission" action. The account gate lives behind that action (via
 * /api/referrals/context), so no invitation or application is created before
 * registration; the confirmed intro is carried into registration, which
 * continues straight to the CV upload page.
 */
export function ReferralLanding({
  result,
  referralToken,
}: {
  result: PublicReferralResult;
  referralToken: string;
}) {
  const router = useRouter();
  const [openSections, setOpenSections] = useState<Set<IntroSectionId>>(
    () => new Set(["overview"]),
  );
  const [isNavigating, setIsNavigating] = useState(false);
  const [isInviteNoticeOpen, setIsInviteNoticeOpen] = useState(false);

  useEffect(() => {
    if (result.status !== "VALID") {
      return;
    }
    const storageKey = buildInviteNoticeStorageKey(null, referralToken);
    if (!storageKey || hasSeenInviteNotice(storageKey)) {
      return;
    }
    // Open after the first paint so hydration matches the server render.
    const frame = requestAnimationFrame(() => setIsInviteNoticeOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [referralToken, result.status]);

  function toggleSection(sectionId: IntroSectionId) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function handleInviteNoticeDismiss(dontShowAgain: boolean) {
    if (dontShowAgain) {
      const storageKey = buildInviteNoticeStorageKey(null, referralToken);
      if (storageKey) {
        rememberInviteNotice(storageKey);
      }
    }
    setIsInviteNoticeOpen(false);
  }

  if (result.status === "UNAVAILABLE") {
    return (
      <PageFrame>
        <PageShell
          title="Global Excellent Scientists Fund"
          description="Referral link status."
          headerVariant="centered"
        >
          <div className="mx-auto max-w-2xl space-y-6">
            <StatusBanner
              tone="neutral"
              title="This referral link is no longer available"
              description="The link may have expired or been deactivated. You can still create an account and start your application directly."
            />
            <div className="flex justify-center">
              <ActionButton onClick={() => router.push("/signup")}>
                <span>Create an account</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </ActionButton>
            </div>
          </div>
        </PageShell>
      </PageFrame>
    );
  }

  function handleContinue() {
    // Full navigation: the context route 307s into the sign-up/sign-in flow
    // (or straight to the CV upload for signed-in users), so the client-side
    // router cannot follow it.
    setIsNavigating(true);
    window.location.assign(
      `/api/referrals/context?t=${encodeURIComponent(referralToken)}`,
    );
  }

  return (
    <PageFrame>
      <ApplyInviteNoticeDialog
        // The public referral payload carries no expiry date, so the notice
        // falls back to the invitation-email wording.
        invitationExpirationLabel={null}
        isOpen={isInviteNoticeOpen}
        onOpenChange={setIsInviteNoticeOpen}
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
        maxAccessibleStep={0}
        headerSlot={
          <div className="flex justify-center">
            <span className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--primary)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,25,47,0.16)]">
              {APPLICATION_DEADLINE_PILL}
            </span>
          </div>
        }
      >
        <div className="mx-auto max-w-4xl space-y-4">
          <section
            className={APPLY_ENTRY_ACCORDION_SECTION_CLASS}
            aria-label="Application information"
          >
            <ApplyEntryProgramIntroduction
              openSections={openSections}
              onToggleSection={toggleSection}
            />
          </section>

          <div className="flex justify-center py-4">
            <ActionButton onClick={handleContinue} disabled={isNavigating}>
              <span>
                {isNavigating ? "Opening..." : "Continue to CV Submission"}
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
