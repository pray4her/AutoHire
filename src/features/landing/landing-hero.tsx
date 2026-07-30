import Link from "next/link";

import { LANDING_HERO } from "./landing-content";
import { LandingReveal } from "./landing-reveal";

/**
 * Hero band: navy gradient, gold accent glow (pure CSS, no image requests),
 * staggered first-screen reveal via LandingReveal.
 */
export function LandingHero() {
  return (
    <section
      data-track-section="hero"
      aria-labelledby="landing-hero-title"
      className="relative overflow-hidden bg-[linear-gradient(180deg,var(--landing-navy),var(--landing-navy-deep))]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_72%_8%,rgba(176,138,46,0.2),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(176,138,46,0.6),transparent)]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
        <LandingReveal>
          <p className="text-xs font-medium tracking-[0.3em] text-[color:var(--landing-gold)] uppercase">
            {LANDING_HERO.eyebrow}
          </p>
        </LandingReveal>
        <LandingReveal delay={0.08}>
          <h1
            id="landing-hero-title"
            className="mt-6 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-semibold tracking-tight text-[color:var(--landing-paper)] sm:text-6xl"
          >
            {LANDING_HERO.title}
          </h1>
        </LandingReveal>
        <LandingReveal delay={0.16}>
          <p className="mt-6 max-w-2xl font-[family-name:var(--font-serif)] text-lg leading-relaxed text-[color:var(--landing-paper)]/85">
            {LANDING_HERO.lede}
          </p>
        </LandingReveal>
        <LandingReveal delay={0.24}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={LANDING_HERO.primaryCta.href}
              data-track-cta="hero_primary"
              className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--landing-gold)] px-6 text-sm font-semibold text-[color:var(--landing-navy-deep)] transition-colors hover:bg-[color:var(--landing-paper)] motion-reduce:transition-none"
            >
              {LANDING_HERO.primaryCta.label}
            </Link>
            <a
              href={LANDING_HERO.secondaryCta.href}
              data-track-cta="hero_secondary"
              className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--landing-hairline-light)] px-6 text-sm font-medium text-[color:var(--landing-paper)] transition-colors hover:border-[color:var(--landing-paper)] motion-reduce:transition-none"
            >
              {LANDING_HERO.secondaryCta.label}
            </a>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
