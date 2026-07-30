import { LANDING_PROGRAMS_SECTION } from "./landing-content";
import { LandingReveal } from "./landing-reveal";
import {
  LandingEyebrow,
  LandingSection,
  LandingSectionHeading,
} from "./landing-section";

export function LandingPrograms() {
  return (
    <LandingSection
      id="programs"
      trackSection="programs"
      labelledBy="landing-programs-title"
    >
      <LandingReveal>
        <LandingEyebrow>{LANDING_PROGRAMS_SECTION.eyebrow}</LandingEyebrow>
        <LandingSectionHeading id="landing-programs-title">
          {LANDING_PROGRAMS_SECTION.title}
        </LandingSectionHeading>
      </LandingReveal>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {LANDING_PROGRAMS_SECTION.items.map((program, index) => (
          <LandingReveal key={program.code} delay={index * 0.08}>
            <article className="flex h-full flex-col rounded-2xl border border-[color:var(--landing-hairline)] bg-[color:var(--landing-paper-raised)] p-8 shadow-[var(--landing-shadow)]">
              <p
                aria-hidden
                className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[color:var(--landing-gold)]"
              >
                {program.code}
              </p>
              <h3 className="mt-6 text-lg font-semibold text-[color:var(--landing-ink)]">
                {program.name}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[color:var(--landing-ink-soft)]">
                {program.description}
              </p>
            </article>
          </LandingReveal>
        ))}
      </div>
    </LandingSection>
  );
}
