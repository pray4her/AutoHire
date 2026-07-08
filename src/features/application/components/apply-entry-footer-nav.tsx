"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import {
  TOP_INFO_ITEMS,
  type TopInfoSectionId,
} from "@/features/application/components/apply-entry-intro-content";
import { renderApplyEntryTopInfoContent } from "@/features/application/components/apply-entry-top-info-content";
import { cn } from "@/lib/utils";

const APPLY_ENTRY_FOOTER_SURFACE_CLASS =
  "border-t border-[color:var(--border)]/80 bg-[color:var(--background-elevated)]/52 text-[color:var(--foreground)] shadow-[0_-24px_64px_rgba(10,25,47,0.07)] backdrop-blur-2xl backdrop-saturate-150";

const FOOTER_PANEL_EXPAND_MS = 200;

export function ApplyEntryFooterNav() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [openSectionId, setOpenSectionId] = useState<TopInfoSectionId | null>(
    null,
  );
  const sectionRefs = useRef<Partial<Record<TopInfoSectionId, HTMLDivElement>>>(
    {},
  );

  function handleNavClick(sectionId: TopInfoSectionId) {
    setOpenSectionId((currentSectionId) =>
      currentSectionId === sectionId ? null : sectionId,
    );
  }

  useEffect(() => {
    if (!openSectionId) {
      return;
    }

    const scrollDelayMs = shouldReduceMotion ? 0 : FOOTER_PANEL_EXPAND_MS;
    const timeoutId = window.setTimeout(() => {
      sectionRefs.current[openSectionId]?.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
        block: "nearest",
      });
    }, scrollDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [openSectionId, shouldReduceMotion]);

  return (
    <footer
      data-testid="apply-entry-footer-nav"
      className={cn(
        "relative left-1/2 mt-16 w-screen max-w-none -translate-x-1/2",
        APPLY_ENTRY_FOOTER_SURFACE_CLASS,
      )}
    >
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <nav aria-label="Company information" className="flex flex-col">
          {TOP_INFO_ITEMS.map((item) => {
            const isOpen = openSectionId === item.id;
            const panelId = `apply-footer-panel-${item.id}`;
            const triggerId = `apply-footer-trigger-${item.id}`;

            return (
              <div
                key={item.id}
                ref={(node) => {
                  if (node) {
                    sectionRefs.current[item.id] = node;
                    return;
                  }

                  delete sectionRefs.current[item.id];
                }}
                data-testid={`apply-footer-section-${item.id}`}
                className="scroll-mt-24 border-b border-[color:var(--border)]/70"
              >
                <button
                  type="button"
                  id={triggerId}
                  aria-label={item.title}
                  className={cn(
                    "grid w-full grid-cols-[minmax(0,1fr)_2.5rem] items-start gap-3 py-5 text-left transition hover:bg-white/28 motion-reduce:transition-none",
                    isOpen ? "bg-white/22" : "",
                  )}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? panelId : undefined}
                  onClick={() => handleNavClick(item.id)}
                >
                  <span className="min-w-0 text-base leading-6 font-semibold tracking-[-0.02em] text-[color:var(--primary)] sm:text-[1.05rem] sm:leading-7">
                    {item.title}
                  </span>
                  <span
                    className="flex size-10 items-center justify-center self-start"
                    aria-hidden
                  >
                    <ChevronDown
                      className={cn(
                        "size-5 text-slate-400 transition-transform duration-200 ease-out motion-reduce:transition-none",
                        isOpen ? "rotate-180 text-[color:var(--primary)]" : "",
                      )}
                    />
                  </span>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
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
                    <div className="px-0 pt-1 pb-6">
                      {renderApplyEntryTopInfoContent(item.id)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
