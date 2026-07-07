"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRIVACY_STATEMENT_ITEMS } from "@/features/application/constants";

export function PrivacyStatementDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-9 rounded-full px-4 text-[0.82rem] font-semibold tracking-[0.01em]"
        onClick={() => setOpen(true)}
      >
        Privacy Statement
      </Button>
      <DialogContent
        className="h-auto max-h-[min(42rem,calc(100vh-2rem))] gap-0 overflow-hidden rounded-[1.1rem] border-[color:var(--border)] bg-[color:var(--background-elevated)] p-0 sm:max-w-[40rem]"
      >
        <div className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.1),transparent_72%)]" />
          <div className="relative flex flex-col">
            <DialogHeader className="border-b border-[color:var(--border)] px-6 pt-6 pb-5 sm:px-8 sm:pt-7 sm:pb-6">
              <DialogTitle className="text-left text-[1.2rem] leading-tight font-semibold tracking-[-0.03em] text-[color:var(--primary)] sm:text-[1.45rem]">
                Privacy Statement
              </DialogTitle>
            </DialogHeader>

            <ol className="flex flex-col gap-5 border-b border-[color:var(--border)] px-6 py-5 sm:px-8 sm:py-6">
              {PRIVACY_STATEMENT_ITEMS.map((item, index) => (
                <li key={item}>
                  <div className="flex items-start gap-4">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-xs font-semibold text-white shadow-[0_8px_18px_rgba(10,25,47,0.12)]">
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-7 text-[color:var(--foreground-soft)]">
                      {item}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
