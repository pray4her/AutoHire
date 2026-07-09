"use client";

import { useEffect, useState } from "react";

import { PageFrame, PageShell } from "@/components/ui/page-shell";
import { ApplyEntryFooterNav } from "@/features/application/components/apply-entry-footer-nav";
import { ApplyEntryProgramIntroduction } from "@/features/application/components/apply-entry-program-introduction";
import {
  APPLICATION_DEADLINE_PILL,
  APPLY_ENTRY_ACCORDION_SECTION_CLASS,
  INTRO_DESCRIPTION,
  type IntroSectionId,
} from "@/features/application/components/apply-entry-intro-content";
import { ApplyExpiredInviteDialog } from "@/features/application/components/apply-expired-invite-dialog";
import { buildTrackedRequestHeaders } from "@/lib/tracking/client";

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

async function clearExpiredSessionCookieIfPresent() {
  try {
    await fetch("/api/expert-session", {
      credentials: "include",
      cache: "no-store",
      headers: buildTrackedRequestHeaders(),
    });
  } catch {
    // Best-effort cookie clear; the read-only page does not depend on session state.
  }
}

export function ApplyExpiredReadOnlyEntry() {
  const [isExpiredNoticeOpen, setIsExpiredNoticeOpen] = useState(true);
  const [openSections, setOpenSections] = useState<Set<IntroSectionId>>(
    () => new Set(["overview"]),
  );

  useEffect(() => {
    void clearExpiredSessionCookieIfPresent();
  }, []);

  return (
    <PageFrame>
      <ApplyExpiredInviteDialog
        isOpen={isExpiredNoticeOpen}
        onOpenChange={setIsExpiredNoticeOpen}
        onDismiss={() => {
          setIsExpiredNoticeOpen(false);
        }}
      />

      <PageShell
        title="Global Excellent Scientists Fund"
        description={INTRO_DESCRIPTION}
        headerTitleClassName="font-normal"
        headerVariant="centered"
        className="pb-0"
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
              onToggleSection={(sectionId) => {
                setOpenSections((currentOpenSections) =>
                  toggleIntroSection(currentOpenSections, sectionId),
                );
              }}
            />
          </section>
        </div>
      </PageShell>

      <ApplyEntryFooterNav />
    </PageFrame>
  );
}
