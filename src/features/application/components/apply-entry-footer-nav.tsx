"use client";

import { TOP_INFO_ITEMS } from "@/features/application/components/apply-entry-intro-content";
import { renderApplyEntryTopInfoContent } from "@/features/application/components/apply-entry-top-info-content";
import { cn } from "@/lib/utils";

const APPLY_ENTRY_FOOTER_SURFACE_CLASS =
  "border-t border-[color:var(--border)]/80 bg-[color:var(--background-elevated)]/52 text-[color:var(--foreground)] shadow-[0_-24px_64px_rgba(10,25,47,0.07)] backdrop-blur-2xl backdrop-saturate-150";

export function ApplyEntryFooterNav() {
  return (
    <footer
      data-testid="apply-entry-footer-nav"
      className={cn(
        "relative left-1/2 mt-16 w-screen max-w-none -translate-x-1/2",
        APPLY_ENTRY_FOOTER_SURFACE_CLASS,
      )}
    >
      <div className="w-full px-3 sm:px-4 lg:px-5">
        <nav
          aria-label="Company information"
          className="flex flex-col divide-y divide-[color:var(--border)]/70 lg:flex-row lg:divide-x lg:divide-y-0"
        >
          {TOP_INFO_ITEMS.map((item) => {
            const headingId = `apply-footer-heading-${item.id}`;

            return (
              <section
                key={item.id}
                data-testid={`apply-footer-section-${item.id}`}
                className="flex min-w-0 flex-1 scroll-mt-24 flex-col gap-3 py-6 lg:gap-4 lg:px-3 xl:px-4"
              >
                <h2
                  id={headingId}
                  className="text-base leading-6 font-semibold text-[color:var(--primary)] sm:text-[1.05rem] sm:leading-7"
                >
                  {item.title}
                </h2>

                <div
                  role="region"
                  aria-labelledby={headingId}
                  className="min-w-0"
                >
                  {renderApplyEntryTopInfoContent(item.id)}
                </div>
              </section>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
