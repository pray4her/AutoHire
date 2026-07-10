import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERSONALIZED_LINK_NOTICE_ITEMS } from "@/features/application/components/apply-entry-intro-content";

const DONT_SHOW_AGAIN_LABEL = "Don't show this again";

type ApplyInviteNoticeDialogProps = {
  readonly invitationExpirationLabel: string;
  readonly isOpen: boolean;
  readonly onOpenChange: (nextOpen: boolean) => void;
  readonly onDismiss: (dontShowAgain: boolean) => void;
};

export function ApplyInviteNoticeDialog({
  invitationExpirationLabel,
  isOpen,
  onOpenChange,
  onDismiss,
}: ApplyInviteNoticeDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDontShowAgain(false);
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      disablePointerDismissal
      onOpenChange={(nextOpen, eventDetails) => {
        // Only "I understand" may dismiss; ignore outside click / Escape.
        if (!nextOpen) {
          eventDetails.cancel();
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
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
                  Regarding Your Personalized Application Link
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 py-5 sm:px-8 sm:py-6">
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

            <div className="shrink-0 flex flex-col gap-4 border-t border-[color:var(--border)] bg-white/82 px-6 py-5 sm:px-8 sm:py-6">
              <p className="max-w-[32rem] text-sm leading-6 text-[color:var(--foreground-soft)]">
                Keep the original email so you can reopen the same link if you
                continue on another device or browser.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[color:var(--foreground-soft)]">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(event) => {
                      setDontShowAgain(event.target.checked);
                    }}
                    className="size-4 shrink-0 rounded border-[color:var(--border)] text-[color:var(--primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/30"
                  />
                  <span>{DONT_SHOW_AGAIN_LABEL}</span>
                </label>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    onDismiss(dontShowAgain);
                  }}
                  className="min-h-12 min-w-36 self-end rounded-md px-6 sm:self-auto"
                >
                  I understand
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
