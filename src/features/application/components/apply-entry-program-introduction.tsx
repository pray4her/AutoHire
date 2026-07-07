import { ChevronDown } from "lucide-react";

import {
  APPLY_ENTRY_ACCORDION_PANEL_CLASS,
  APPLY_ENTRY_ACCORDION_TRIGGER_CLASS,
  INTRO_SECTION_ITEMS,
  type IntroSectionId,
} from "@/features/application/components/apply-entry-intro-content";
import { renderProgramIntroductionContent } from "@/features/application/components/apply-entry-program-introduction-content";
import { cn } from "@/lib/utils";

type ProgramIntroductionProps = {
  readonly openSections: ReadonlySet<IntroSectionId>;
  readonly onToggleSection: (sectionId: IntroSectionId) => void;
};

export function ApplyEntryProgramIntroduction({
  openSections,
  onToggleSection,
}: ProgramIntroductionProps) {
  return (
    <>
      {INTRO_SECTION_ITEMS.map((section) => {
          const isOpen = openSections.has(section.id);
          const panelId = `apply-intro-panel-${section.id}`;

          return (
            <div key={section.id} className="bg-white/72">
              <button
                type="button"
                id={`apply-intro-trigger-${section.id}`}
                className={APPLY_ENTRY_ACCORDION_TRIGGER_CLASS}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => onToggleSection(section.id)}
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
                      isOpen ? "rotate-180 text-[color:var(--primary)]" : "",
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
                  <div className={APPLY_ENTRY_ACCORDION_PANEL_CLASS}>
                    <div className="w-full min-w-0 max-w-none">
                      {renderProgramIntroductionContent(section.id)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
    </>
  );
}
