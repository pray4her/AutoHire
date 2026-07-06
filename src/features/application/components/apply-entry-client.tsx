"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ActionButton,
  PageFrame,
  PageShell,
  StatusBanner,
} from "@/components/ui/page-shell";
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
import { cn } from "@/lib/utils";

type ApplyEntryClientProps = {
  initialSnapshot: ApplicationSnapshot;
  openedFromInviteLink: boolean;
};

const PROCESS = [
  "About GESF",
  "CV Submission",
  "Upload Required Documents",
  "Submission Complete",
] as const;

const INTRO_DESCRIPTION =
  "The 2026 application cycle is now closed. We are currently preparing for the 2027 application. Due to the large volume of required documents, please contact us early to begin your preparations.";

const APPLICATION_DEADLINE_PILL = "Applications are accepted year-round.";

const INVITE_NOTICE_STORAGE_KEY_PREFIX = "apply-invite-notice-seen";

const COMPETITIVE_PACKAGE_ITEMS = [
  "Annual Salary: ¥500K – ¥2M RMB (negotiable)",
  "Talent Reward: ¥1.5M – ¥6M RMB (paid over 3–5 years)",
  "Comprehensive Benefits: Including housing subsidies, children's school enrollment support, tax benefits",
  'Title: the prestigious "National High-Level Talent" title.',
] as const;

const ELIGIBILITY_NOTE =
  "Note: The three sets of criteria below are not mutually exclusive; a candidate can meet more than one category, and this does not affect their eligibility.";

const ELIGIBILITY_CATEGORIES = [
  {
    title: "Category I: Young Talents",
    items: [
      "Hold a doctoral degree;",
      "Have at least 3 consecutive years of full-time work experience outside mainland China after obtaining the doctoral degree (short gaps are allowed), and currently hold a formal position outside mainland China;",
      "Under the age of 40.",
    ],
  },
  {
    title: "Category II: Innovative Talents",
    items: [
      "Hold a doctoral degree;",
      "Have at least 3 consecutive years of full-time work experience outside mainland China after obtaining the doctoral degree (short gaps are allowed), and currently hold a formal position outside mainland China;",
      "Hold a position equivalent to associate professor in academic institutions, or a position equivalent to middle to senior positions or above in the industry. (Note: No age limit applies to this category.)",
    ],
  },
  {
    title: "Category III: Distinguished Engineers",
    items: [
      "Hold a bachelor's degree or above;",
      "Have at least 10 consecutive years of full-time work experience in enterprises outside mainland China after obtaining the bachelor's degree (short gaps are allowed), and currently hold a formal position in an enterprise outside mainland China;",
      "Currently hold a core technical role with a professional technical title equivalent to senior engineer or above.",
    ],
  },
] as const;

const APPLICATION_PROCESS_INSTRUCTIONS = [
  {
    title: "Year-round Application Acceptance",
    description:
      "We accept applications throughout the year. We recommend submitting your materials as early as possible so we can fully prepare your application.",
  },
  {
    title: "Official Submission Window",
    description:
      "The official submission window is tentatively scheduled from January to May each year, subject to annual adjustments. During this period, we will assist you in submitting the formal application to the official authorities.",
  },
  {
    title: "Result Announcement",
    description:
      "The final selection results will be announced in December of the same year.",
  },
  {
    title: "Preparation Period and Contract Signing",
    description:
      "Selected candidates will be granted a two-year preparation period starting from the year following the announcement of results. During this period, you may flexibly plan your trips to China and determine the employment mode (full-time or part-time).",
  },
] as const;

const SUB_PROGRAMS = [
  "Qiming Plan (QM)",
  "Torch Plan (HJ)",
  "Changjiang Scholar",
] as const;

const INTRO_SECTION_ITEMS = [
  {
    id: "overview",
    title: "Global Excellent Scientists Fund (GESF)",
    summary: "Program Mission & Objectives",
  },
  {
    id: "benefits",
    title: "Benefits",
    summary: "Competitive Package",
  },
  {
    id: "eligibility",
    title: "Eligibility",
    summary:
      "Young Talents, Innovative Talents, or Distinguished Engineers.",
  },
  {
    id: "process",
    title: "Online Application Process",
    summary:
      "Four steps, progress saves at each stage, and feedback after you submit.",
  },
  {
    id: "timeline",
    title: "Instructions for Application Process",
    summary:
      "Year-round acceptance, official submission window, results, and preparation period.",
  },
  {
    id: "about",
    title: "About Our Service",
    summary:
      "Professional Service Provider for National Talent Programs: Our Role and Commitment",
  },
] as const;

type IntroSectionId = (typeof INTRO_SECTION_ITEMS)[number]["id"];

const INTRO_SECTION_TRIGGER_CLASS =
  "grid w-full grid-cols-[minmax(0,1fr)_2.5rem] items-start gap-3 px-5 py-5 text-left transition hover:bg-[color:var(--muted)]/55 sm:px-6";

const INTRO_SECTION_PANEL_CLASS =
  "w-full min-w-0 border-t border-[color:var(--border)] bg-[color:var(--muted)]/38 px-5 py-5 sm:px-6";

const PERSONALIZED_LINK_NOTICE_ITEMS = [
  {
    title: "Unique Link – Please Do Not Forward",
    description:
      "The link you received is exclusively generated for you and can only be used to submit a single application. To protect your personal privacy, please do not forward this link to others.",
  },
  {
    title: "Link Expiration Date",
    description:
      "This link will remain valid until {expirationDate}. Please be aware of the deadline and complete your submission as soon as possible, as the link will automatically expire afterward.",
  },
  {
    title: "Saving Progress & Switching Devices",
    description:
      "Within the valid period, the system will automatically record and save your progress. If you switch to a different phone, computer, or browser midway through the process, please ensure you re-enter the application by clicking the full link in the original email. This will allow you to seamlessly resume your previous entries.",
  },
] as const;

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

function buildInviteNoticeStorageKey(
  snapshot: Pick<ApplicationSnapshot, "applicationId" | "invitationId"> | null,
  token: string | null,
) {
  const inviteKey = snapshot?.invitationId || snapshot?.applicationId || token;

  return inviteKey
    ? `${INVITE_NOTICE_STORAGE_KEY_PREFIX}:${inviteKey}`
    : null;
}

function hasSeenInviteNotice(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "seen";
  } catch {
    return false;
  }
}

function rememberInviteNotice(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "seen");
  } catch {
  }
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

  function renderSectionContent(sectionId: IntroSectionId) {
    switch (sectionId) {
      case "overview":
        return (
          <div className="space-y-4 text-sm leading-7 text-[color:var(--foreground-soft)]">
            <p>
              The Global Excellent Scientists Fund (GESF), also known as the{" "}
              <strong className="text-base font-semibold text-[color:var(--foreground)]">
                China Talent Program
              </strong>
              , is a prestigious national-level talent program initiated by
              relevant Chinese government departments. Its primary mission is to
              attract overseas scholars—including those from Hong Kong, Macau,
              and Taiwan, regardless of nationality—to conduct research and
              innovation in China, thereby contributing to the nation&apos;s
              scientific and technological advancement.
            </p>
            <p>
              The program{" "}
              <strong className="font-semibold text-[color:var(--foreground)]">
                mainly
              </strong>{" "}
              encompasses the following sub-projects:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              {SUB_PROGRAMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );
      case "benefits":
        return (
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-7 text-[color:var(--foreground-soft)] marker:font-semibold">
            {COMPETITIVE_PACKAGE_ITEMS.map((item) => (
              <li key={item} className="pl-1">
                {item}
              </li>
            ))}
          </ol>
        );
      case "eligibility":
        return (
          <div className="space-y-5 text-sm leading-7 text-[color:var(--foreground-soft)]">
            <p>
              Applicants must{" "}
              <strong className="font-semibold text-[color:var(--foreground)]">
                meet at least one
              </strong>{" "}
              of the following three sets of criteria.
            </p>
            <p>{ELIGIBILITY_NOTE}</p>

            {ELIGIBILITY_CATEGORIES.map((category) => (
              <div key={category.title} className="space-y-3">
                <p className="font-semibold text-[color:var(--foreground)]">
                  {category.title}
                </p>
                <ol className="list-decimal space-y-3 pl-5 marker:font-semibold">
                  {category.items.map((item) => (
                    <li key={item} className="pl-1">
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        );
      case "process":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {PROCESS.map((item, index) => (
                <div
                  key={item}
                  className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-3"
                >
                  <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[color:var(--primary)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-3 text-sm leading-7 text-[color:var(--foreground-soft)]">
              <p>
                The application process is linear, steps cannot be bypassed.
              </p>
              <p>Progress can be saved at each stage.</p>
              <p>
                You will receive feedback from our team within one week of final
                submission.
              </p>
            </div>
          </div>
        );
      case "timeline":
        return (
          <ol className="list-decimal space-y-5 pl-5 text-sm leading-7 text-[color:var(--foreground-soft)] marker:font-semibold">
            {APPLICATION_PROCESS_INSTRUCTIONS.map((step) => (
              <li key={step.title} className="pl-1">
                <p className="font-semibold text-[color:var(--foreground)]">
                  {step.title}
                </p>
                <p className="mt-2">{step.description}</p>
              </li>
            ))}
          </ol>
        );
      case "about":
        return (
          <div className="flex flex-col gap-4 text-sm leading-7 text-[color:var(--foreground-soft)]">
            <p>
              <strong className="font-bold text-black">
                Meet Technology (Wuhan) Co., Ltd.
              </strong>{" "}
              is a licensed professional service institution for national-level
              talent programs. We specialize in{" "}
              <strong className="font-bold text-black">
                providing full-process application support for high-level
                overseas talents
              </strong>
              . Should you choose to submit your application through us, we will
              offer you three core services:
            </p>
            <ol className="list-decimal space-y-3 pl-5 marker:font-semibold">
              <li className="pl-1">
                <span className="font-semibold text-[color:var(--foreground)]">
                  Material Preparation:
                </span>{" "}
                A professional team will assist you in collating application
                materials including resumes, achievement certificates, and
                recommendation letters. We ensure that the application documents
                we prepare for you meet national requirements and are highly
                competitive.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-[color:var(--foreground)]">
                  Platform Matching:
                </span>{" "}
                We will match you with competitive Chinese universities,
                research institutions and enterprises as your application
                platform. (The talent program requires candidates to apply
                jointly with a platform.)
              </li>
              <li className="pl-1">
                <span className="font-semibold text-[color:var(--foreground)]">
                  Post-selection Support:
                </span>{" "}
                Upon your successful selection in the talent program, we will
                assist you in coordinating with local governments and affiliated
                platforms, facilitate the onboarding procedure, secure the
                incentive and subsidy funds, and obtain the national-level
                talent honor title.
              </li>
            </ol>
            <p>
              <strong className="font-semibold text-[color:var(--foreground)]">
                Beyond the talent program, we provide the following value-added
                services.
              </strong>
            </p>
            <ol className="list-decimal space-y-3 pl-5 marker:font-semibold">
              <li className="pl-1">
                <span className="font-semibold text-[color:var(--foreground)]">
                  Academic Exchange:
                </span>{" "}
                We organize online and offline seminars and special lectures for
                overseas scholars, domestic universities and enterprises, so as
                to build long-term cooperation bridges.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-[color:var(--foreground)]">
                  Conferences &amp; Forums:
                </span>{" "}
                You may participate in international academic conferences and
                industry summits organized by us. We assist you in presenting
                research achievements and expanding industrial resources.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-[color:var(--foreground)]">
                  Technology Transfer:
                </span>{" "}
                We assist in commercializing your technological achievements
                with Chinese enterprises.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-[color:var(--foreground)]">
                  Entrepreneurial Financing &amp; Client Development:
                </span>{" "}
                We assist you in establishing enterprises in China, and support
                the commercialization of scientific research achievements from
                laboratories to the market.
              </li>
            </ol>
            <div>
              <p className="font-semibold text-[color:var(--foreground)]">
                Our Service Outcomes and Industry Accreditation
              </p>
              <p className="mt-2">
                Our services span over 200 cities and regions nationwide. To
                date, we have organized more than 500 talent matching events,
                industry forums, project roadshows and field inspection visits.
                We have successfully matched over 5,000 high-level overseas
                talents with domestic local governments, universities and
                enterprises. With our professional support, more than 500
                candidates have been admitted to national, provincial and
                municipal talent programs. As a core service partner of the GESF
                ecosystem, our professionalism and comprehensive resource
                integration capabilities have earned widespread recognition from
                all sectors.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <PageFrame>
      <Dialog
        open={isInviteNoticeOpen}
        onOpenChange={handleInviteNoticeOpenChange}
      >
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden rounded-[1.1rem] border-none bg-transparent p-0 shadow-[0_28px_72px_rgba(15,23,42,0.28)] sm:max-w-[44rem]"
        >
          <div className="relative overflow-hidden rounded-[1.1rem] border border-[color:var(--border)] bg-[color:var(--background-elevated)]">
            <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_72%)]" />
            <div className="relative flex flex-col">
              <DialogHeader className="border-b border-[color:var(--border)] px-6 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6">
                <DialogTitle className="flex max-w-[31rem] min-w-0 flex-col gap-2 text-left">
                  <span className="text-[0.72rem] font-semibold tracking-[0.22em] text-[color:var(--foreground-soft)] uppercase">
                    Important Notice
                  </span>
                  <span className="text-[1.28rem] leading-[1.14] font-semibold tracking-[-0.035em] text-[color:var(--primary)] sm:text-[1.72rem]">
                    Regarding Your Personalized Application Link
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="max-h-[min(27rem,56vh)] overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
                <ol className="flex flex-col gap-5">
                  {PERSONALIZED_LINK_NOTICE_ITEMS.map((item, index) => {
                    const description = item.description.replace(
                      "{expirationDate}",
                      invitationExpirationLabel,
                    );

                    return (
                      <li key={item.title}>
                        <div className="flex items-start gap-4">
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(10,25,47,0.14)]">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.98rem] font-semibold leading-6 text-[color:var(--foreground)]">
                              {item.title}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[color:var(--foreground-soft)]">
                              {description}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="flex flex-col gap-4 border-t border-[color:var(--border)] bg-white/82 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
                <p className="max-w-[32rem] text-sm leading-6 text-[color:var(--foreground-soft)]">
                  Keep the original email so you can reopen the same link if
                  you continue on another device or browser.
                </p>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleInviteNoticeDismiss}
                  className="min-h-12 min-w-36 self-end rounded-md px-6 sm:self-auto"
                >
                  I understand
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PageShell
        title="Global Excellent Scientists Fund"
        description={INTRO_DESCRIPTION}
        headerTitleClassName="font-normal"
        headerVariant="centered"
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
            className="overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--background-elevated)] shadow-[var(--shadow-card)]"
            aria-label="Program introduction"
          >
            <div className="divide-y divide-[color:var(--border)]">
              {INTRO_SECTION_ITEMS.map((section) => {
                const isOpen = openSections.has(section.id);
                const panelId = `apply-intro-panel-${section.id}`;

                return (
                  <div key={section.id} className="bg-white/72">
                    <button
                      type="button"
                      id={`apply-intro-trigger-${section.id}`}
                      className={INTRO_SECTION_TRIGGER_CLASS}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() =>
                        setOpenSections((current) =>
                          toggleIntroSection(current, section.id),
                        )
                      }
                    >
                      <div className="min-w-0">
                        <p className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--primary)]">
                          {section.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-soft)]">
                          {section.summary}
                        </p>
                      </div>
                      <span
                        className="flex size-10 items-center justify-center self-start"
                        aria-hidden
                      >
                        <ChevronDown
                          className={cn(
                            "size-5 text-slate-400 transition-transform duration-200 ease-out motion-reduce:transition-none",
                            isOpen
                              ? "rotate-180 text-[color:var(--primary)]"
                              : "",
                          )}
                        />
                      </span>
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={`apply-intro-trigger-${section.id}`}
                      aria-hidden={!isOpen}
                      className={cn(
                        "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div
                        className="overflow-hidden"
                        inert={!isOpen ? true : undefined}
                      >
                        <div className={INTRO_SECTION_PANEL_CLASS}>
                          <div className="w-full min-w-0 max-w-none">
                            {renderSectionContent(section.id)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
    </PageFrame>
  );
}
