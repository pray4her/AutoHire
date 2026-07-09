"use client";

import { Mail, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TALENT_CONSULTANT_EMAIL,
  TALENT_CONSULTANT_PHONE,
  TALENT_CONSULTANT_WHATSAPP_URL,
} from "@/features/application/components/apply-entry-intro-content";

export const EXPIRED_INVITE_NOTICE_TITLE = "Invitation Link Expired";
export const EXPIRED_INVITE_NOTICE_DESCRIPTION =
  "This invitation link has expired. Please contact the program team for a new invitation.";

type ApplyExpiredInviteDialogProps = {
  readonly isOpen: boolean;
  readonly onOpenChange: (nextOpen: boolean) => void;
  readonly onDismiss: () => void;
};

export function ApplyExpiredInviteDialog({
  isOpen,
  onOpenChange,
  onDismiss,
}: ApplyExpiredInviteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-auto max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-[1.1rem] border-none bg-transparent p-0 shadow-[0_28px_72px_rgba(15,23,42,0.28)] sm:max-w-[44rem]"
      >
        <div className="relative rounded-[1.1rem] border border-[color:var(--border)] bg-[color:var(--background-elevated)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_72%)]" />
          <div className="relative flex flex-col">
            <DialogHeader className="shrink-0 border-b border-[color:var(--border)] px-6 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6">
              <DialogTitle className="flex max-w-[31rem] min-w-0 flex-col gap-2 text-left">
                <span className="text-[0.72rem] font-semibold tracking-[0.22em] text-[color:var(--foreground-soft)] uppercase">
                  Important Notice
                </span>
                <span className="text-[1.28rem] leading-snug font-semibold tracking-[-0.035em] text-[color:var(--primary)] sm:text-[1.72rem]">
                  {EXPIRED_INVITE_NOTICE_TITLE}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 py-5 sm:px-8 sm:py-6">
              <p className="text-sm leading-7 text-[color:var(--foreground-soft)]">
                {EXPIRED_INVITE_NOTICE_DESCRIPTION}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <a
                  href={`mailto:${TALENT_CONSULTANT_EMAIL}`}
                  className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-white/88 px-4 py-3 transition hover:border-[color:var(--primary)]"
                >
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--muted)] text-[color:var(--primary)]">
                    <Mail className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[color:var(--foreground)]">
                      Email
                    </span>
                    <span className="mt-0.5 block text-sm leading-6 text-[color:var(--foreground-soft)] break-all">
                      {TALENT_CONSULTANT_EMAIL}
                    </span>
                  </span>
                </a>

                <a
                  href={TALENT_CONSULTANT_WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-white/88 px-4 py-3 transition hover:border-[color:var(--primary)]"
                >
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--muted)] text-[color:var(--primary)]">
                    <MessageCircle className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[color:var(--foreground)]">
                      WhatsApp
                    </span>
                    <span className="mt-0.5 block text-sm leading-6 text-[color:var(--foreground-soft)]">
                      {TALENT_CONSULTANT_PHONE}
                    </span>
                  </span>
                </a>
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-[color:var(--border)] bg-white/82 px-6 py-5 sm:px-8 sm:py-6">
              <Button
                type="button"
                size="lg"
                onClick={onDismiss}
                className="min-h-12 min-w-36 rounded-md px-6"
              >
                I understand
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
