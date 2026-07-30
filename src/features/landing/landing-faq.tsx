import type { QaFaqEntry } from "@/features/qa/types";

import { LANDING_FAQ_SECTION } from "./landing-content";
import { LandingReveal } from "./landing-reveal";
import {
  LandingEyebrow,
  LandingSection,
  LandingSectionHeading,
} from "./landing-section";

type LandingFaqProps = {
  entries: readonly QaFaqEntry[];
};

export function LandingFaq({ entries }: LandingFaqProps) {
  return (
    <LandingSection id="faq" trackSection="faq" labelledBy="landing-faq-title">
      <LandingReveal>
        <LandingEyebrow>{LANDING_FAQ_SECTION.eyebrow}</LandingEyebrow>
        <LandingSectionHeading id="landing-faq-title">
          {LANDING_FAQ_SECTION.title}
        </LandingSectionHeading>
      </LandingReveal>
      {entries.length > 0 ? (
        <div className="mt-12 max-w-3xl divide-y divide-[color:var(--landing-hairline)] border-y border-[color:var(--landing-hairline)]">
          {entries.map((entry, index) => (
            <LandingReveal key={entry.id} delay={Math.min(index, 4) * 0.05}>
              <details className="group py-5">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-base font-semibold text-[color:var(--landing-ink)] marker:hidden [&::-webkit-details-marker]:hidden">
                  {entry.question}
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rotate-45 border-r-2 border-b-2 border-[color:var(--landing-gold-strong)] transition-transform group-open:-rotate-135 motion-reduce:transition-none"
                  />
                </summary>
                <p className="mt-3 text-base leading-relaxed text-[color:var(--landing-ink-soft)]">
                  {entry.answer}
                </p>
              </details>
            </LandingReveal>
          ))}
        </div>
      ) : null}
    </LandingSection>
  );
}
