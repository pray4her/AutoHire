import { LANDING_ELIGIBILITY_SECTION } from "./landing-content";
import { LandingReveal } from "./landing-reveal";
import {
  LandingEyebrow,
  LandingSection,
  LandingSectionHeading,
} from "./landing-section";

export function LandingEligibility() {
  return (
    <LandingSection
      id="eligibility"
      trackSection="eligibility"
      labelledBy="landing-eligibility-title"
    >
      <LandingReveal>
        <LandingEyebrow>{LANDING_ELIGIBILITY_SECTION.eyebrow}</LandingEyebrow>
        <LandingSectionHeading id="landing-eligibility-title">
          {LANDING_ELIGIBILITY_SECTION.title}
        </LandingSectionHeading>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--landing-ink-soft)]">
          {LANDING_ELIGIBILITY_SECTION.intro}
        </p>
      </LandingReveal>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {LANDING_ELIGIBILITY_SECTION.categories.map((category, index) => (
          <LandingReveal key={category.title} delay={index * 0.08}>
            <article className="flex h-full flex-col rounded-2xl border border-[color:var(--landing-hairline)] bg-[color:var(--landing-paper-raised)] p-8">
              <h3 className="text-lg font-semibold text-[color:var(--landing-ink)]">
                {category.title}
              </h3>
              <ol className="mt-5 list-decimal space-y-3 pl-5 text-base leading-relaxed text-[color:var(--landing-ink-soft)] marker:text-[color:var(--landing-gold-strong)]">
                {category.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </article>
          </LandingReveal>
        ))}
      </div>
      <LandingReveal delay={0.16}>
        <p className="mt-10 max-w-3xl border-l-2 border-[color:var(--landing-gold)] pl-5 font-[family-name:var(--font-serif)] text-base leading-relaxed text-[color:var(--landing-ink-soft)] italic">
          {LANDING_ELIGIBILITY_SECTION.note}
        </p>
      </LandingReveal>
    </LandingSection>
  );
}
