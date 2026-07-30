import { LANDING_STATS } from "./landing-content";
import { LandingReveal } from "./landing-reveal";
import { LandingSection } from "./landing-section";

export function LandingStats() {
  return (
    <LandingSection trackSection="stats" ariaLabel="Service track record">
      <dl className="grid gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[color:var(--landing-hairline)]">
        {LANDING_STATS.map((stat, index) => (
          <LandingReveal
            key={stat.label}
            delay={index * 0.08}
            className={index === 0 ? "" : "sm:pl-10"}
          >
            <div className="flex flex-col">
              <dt className="order-2 mt-3 text-sm leading-relaxed text-[color:var(--landing-ink-soft)]">
                {stat.label}
              </dt>
              <dd className="order-1 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[color:var(--landing-gold-strong)]">
                {stat.value}
              </dd>
            </div>
          </LandingReveal>
        ))}
      </dl>
    </LandingSection>
  );
}
