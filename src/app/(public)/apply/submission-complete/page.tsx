"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

import {
  PageFrame,
  PageShell,
  SectionCard,
  StatusBanner,
  getButtonClassName,
} from "@/components/ui/page-shell";
import {
  APPLICATION_FLOW_STEPS_WITH_INTRO,
  SUBMISSION_COMPLETE_CONTACT_EMAIL,
  SUBMISSION_COMPLETE_WECHAT_URL,
  SUBMISSION_COMPLETE_WHATSAPP_URL,
} from "@/features/application/constants";
import { fetchSession } from "@/features/application/client";
import {
  isExpiredInviteAccessError,
  redirectToExpiredInviteReadOnly,
} from "@/features/application/expired-invite-access";
import { SubmissionFeedbackSection } from "@/features/application/components/submission-feedback-section";
import {
  buildApplyFlowStepLinks,
  resolveRouteFromStatus,
} from "@/features/application/route";
import type { ApplicationSnapshot } from "@/features/application/types";
import { ensureInitialReview } from "@/features/material-supplement/client";
import { trackPageView } from "@/lib/tracking/client";
import { usePageDurationTracking } from "@/lib/tracking/use-page-duration-tracking";
import { cn } from "@/lib/utils";

const SUBMISSION_HEADLINE =
  "Submission completed! We will send an email to the address provided in your CV within approximately one week, to inform further steps. Please stay in touch.";
const NEXT_STEP_MESSAGE =
  "Next Step: Connect with your dedicated Talent Consultant.";

/** Mid-size (“s”) success links under QR codes: between compact and full default height. */
const QR_CONTACT_OPEN_LINK_CLASS_NAME = cn(
  getButtonClassName("success"),
  "min-h-10 gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold w-auto",
);

export default function SubmissionCompletePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<ApplicationSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialReviewAttemptedRef = useRef<Set<string>>(new Set());
  const hasTrackedViewRef = useRef(false);

  usePageDurationTracking({
    pageName: "apply_submission_complete",
    stepName: "feedback",
    applicationId:
      snapshot?.applicationStatus === "SUBMITTED"
        ? snapshot.applicationId
        : null,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      let nextSnapshot: ApplicationSnapshot;

      setIsLoading(true);
      setError(null);

      try {
        nextSnapshot = await fetchSession();

        if (!active) {
          return;
        }

        if (nextSnapshot.applicationStatus !== "SUBMITTED") {
          router.replace(
            resolveRouteFromStatus(nextSnapshot.applicationStatus),
          );
          return;
        }

        setSnapshot(nextSnapshot);
      } catch (nextError) {
        if (!active) {
          return;
        }

        if (isExpiredInviteAccessError(nextError)) {
          redirectToExpiredInviteReadOnly(router);
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load the submitted application.",
        );
        return;
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (
      !snapshot ||
      isLoading ||
      hasTrackedViewRef.current ||
      snapshot.applicationStatus !== "SUBMITTED"
    ) {
      return;
    }

    hasTrackedViewRef.current = true;
    void trackPageView({
      pageName: "apply_submission_complete",
      stepName: "feedback",
      applicationId: snapshot.applicationId,
    });
  }, [isLoading, snapshot]);

  useEffect(() => {
    if (!snapshot || snapshot.applicationStatus !== "SUBMITTED") {
      return;
    }

    if (initialReviewAttemptedRef.current.has(snapshot.applicationId)) {
      return;
    }

    initialReviewAttemptedRef.current.add(snapshot.applicationId);
    void ensureInitialReview(snapshot.applicationId).catch(() => {
      initialReviewAttemptedRef.current.delete(snapshot.applicationId);
    });
  }, [snapshot]);

  const flowStepLinks = useMemo(
    () => buildApplyFlowStepLinks(snapshot?.applicationStatus ?? "SUBMITTED"),
    [snapshot?.applicationStatus],
  );

  return (
    <PageFrame>
      <PageShell
        title="Submission complete"
        description="Your application package has been submitted successfully."
        headerVariant="centered"
        steps={APPLICATION_FLOW_STEPS_WITH_INTRO}
        currentStep={3}
        stepIndexing="zero"
        stepLinks={flowStepLinks}
        maxAccessibleStep={3}
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {error ? (
            <StatusBanner
              tone="danger"
              title="The submitted application could not be loaded"
              description={error}
            />
          ) : null}

          {isLoading ? (
            <StatusBanner
              tone="loading"
              title="Loading submitted application"
              description="Restoring your final submission status."
            />
          ) : null}

          {!isLoading && !error && snapshot ? (
            <SectionCard title={SUBMISSION_HEADLINE}>
              <div className="flex flex-col gap-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="h-10 w-10 text-[color:var(--accent)]"
                    aria-hidden
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold text-[color:var(--primary)]">
                      {NEXT_STEP_MESSAGE}
                    </p>
                    <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                      Scan a QR code or use the open link for WeChat or WhatsApp
                      to connect with your consultant and continue follow-up.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--border)] bg-white p-5 sm:p-6">
                  <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm font-semibold text-[color:var(--primary)]">
                        WeChat
                      </p>
                      <div className="rounded-2xl border border-[color:var(--border)] bg-white p-3 shadow-[var(--shadow-card)]">
                        <QRCodeSVG
                          value={SUBMISSION_COMPLETE_WECHAT_URL}
                          size={200}
                          level="M"
                          marginSize={4}
                          title="WeChat QR code for adding the talent consultant"
                        />
                      </div>
                      <a
                        href={SUBMISSION_COMPLETE_WECHAT_URL}
                        className={QR_CONTACT_OPEN_LINK_CLASS_NAME}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle
                          className="size-5 shrink-0"
                          aria-hidden
                        />
                        Open WeChat
                      </a>
                    </div>
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm font-semibold text-[color:var(--primary)]">
                        WhatsApp
                      </p>
                      <div className="rounded-2xl border border-[color:var(--border)] bg-white p-3 shadow-[var(--shadow-card)]">
                        <QRCodeSVG
                          value={SUBMISSION_COMPLETE_WHATSAPP_URL}
                          size={200}
                          level="M"
                          marginSize={4}
                          title="WhatsApp QR code for contacting the overseas talent consultant"
                        />
                      </div>
                      <a
                        href={SUBMISSION_COMPLETE_WHATSAPP_URL}
                        className={QR_CONTACT_OPEN_LINK_CLASS_NAME}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle
                          className="size-5 shrink-0"
                          aria-hidden
                        />
                        Open WhatsApp Chat
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {!isLoading && !error && snapshot ? (
            <SubmissionFeedbackSection applicationId={snapshot.applicationId} />
          ) : null}

          {!isLoading && !error && snapshot ? (
            <p className="px-1 text-xs leading-6 text-[color:var(--foreground-soft)]">
              If you have any questions, please email us at{" "}
              <a
                className="font-medium text-[color:var(--primary)] underline underline-offset-2"
                href={`mailto:${SUBMISSION_COMPLETE_CONTACT_EMAIL}`}
              >
                {SUBMISSION_COMPLETE_CONTACT_EMAIL}
              </a>
              .
            </p>
          ) : null}
        </div>
      </PageShell>
    </PageFrame>
  );
}
