import { LANDING_PROCESS_SECTION } from "./landing-content";
import { LandingReveal } from "./landing-reveal";
import {
  LandingEyebrow,
  LandingSection,
  LandingSectionHeading,
} from "./landing-section";

export function LandingProcess() {
  return (
    <LandingSection
      id="process"
      trackSection="process"
      labelledBy="landing-process-title"
    >
      <LandingReveal>
        <LandingEyebrow>{LANDING_PROCESS_SECTION.eyebrow}</LandingEyebrow>
        <LandingSectionHeading id="landing-process-title">
          {LANDING_PROCESS_SECTION.title}
        </LandingSectionHeading>
      </LandingReveal>
      <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {LANDING_PROCESS_SECTION.steps.map((step, index) => (
          <li key={step.title}>
            <LandingReveal
              delay={index * 0.08}
              className="flex h-full flex-col"
            >
              <span
                aria-hidden
                className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[color:var(--landing-gold-strong)]"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[color:var(--landing-ink)]">
                {step.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-[color:var(--landing-ink-soft)]">
                {step.description}
              </p>
            </LandingReveal>
          </li>
        ))}
      </ol>
      <div className="mt-16 grid gap-x-10 sm:grid-cols-2">
        {LANDING_PROCESS_SECTION.timeline.map((milestone, index) => (
          <LandingReveal key={milestone.title} delay={index * 0.06}>
            <div className="border-t border-[color:var(--landing-hairline)] py-6">
              <h3 className="text-base font-semibold text-[color:var(--landing-ink)]">
                {milestone.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-[color:var(--landing-ink-soft)]">
                {milestone.description}
              </p>
            </div>
          </LandingReveal>
        ))}
      </div>
    </LandingSection>
  );
}
