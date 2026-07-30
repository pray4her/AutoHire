import { LANDING_BENEFITS_SECTION } from "./landing-content";
import { LandingReveal } from "./landing-reveal";
import {
  LandingEyebrow,
  LandingSection,
  LandingSectionHeading,
} from "./landing-section";

export function LandingBenefits() {
  return (
    <LandingSection
      id="benefits"
      trackSection="benefits"
      labelledBy="landing-benefits-title"
    >
      <div className="max-w-3xl">
        <LandingReveal>
          <LandingEyebrow>{LANDING_BENEFITS_SECTION.eyebrow}</LandingEyebrow>
          <LandingSectionHeading id="landing-benefits-title">
            {LANDING_BENEFITS_SECTION.title}
          </LandingSectionHeading>
        </LandingReveal>
        <LandingReveal delay={0.08}>
          <ul className="mt-10 space-y-5">
            {LANDING_BENEFITS_SECTION.items.map((item) => (
              <li key={item} className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="mt-2.5 size-2 shrink-0 rotate-45 bg-[color:var(--landing-gold)]"
                />
                <span className="text-base leading-relaxed text-[color:var(--landing-ink)] sm:text-lg">
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 font-[family-name:var(--font-serif)] text-sm text-[color:var(--landing-ink-soft)] italic">
            {LANDING_BENEFITS_SECTION.disclaimer}
          </p>
        </LandingReveal>
      </div>
    </LandingSection>
  );
}
