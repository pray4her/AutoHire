import Link from "next/link";

import { LANDING_FINAL_CTA } from "./landing-content";
import { LandingReveal } from "./landing-reveal";

export function LandingFinalCta() {
  return (
    <section
      data-track-section="final_cta"
      aria-labelledby="landing-final-cta-title"
      className="relative overflow-hidden bg-[linear-gradient(180deg,var(--landing-navy),var(--landing-navy-deep))]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,rgba(176,138,46,0.18),transparent_70%)]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-24 text-center sm:py-32">
        <LandingReveal>
          <p className="text-xs font-medium tracking-[0.3em] text-[color:var(--landing-gold)] uppercase">
            {LANDING_FINAL_CTA.eyebrow}
          </p>
        </LandingReveal>
        <LandingReveal delay={0.08}>
          <h2
            id="landing-final-cta-title"
            className="mx-auto mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--landing-paper)] sm:text-5xl"
          >
            {LANDING_FINAL_CTA.title}
          </h2>
        </LandingReveal>
        <LandingReveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-2xl font-[family-name:var(--font-serif)] text-lg leading-relaxed text-[color:var(--landing-paper)]/85">
            {LANDING_FINAL_CTA.body}
          </p>
        </LandingReveal>
        <LandingReveal delay={0.24}>
          <div className="mt-10">
            <Link
              href={LANDING_FINAL_CTA.cta.href}
              data-track-cta="final_primary"
              className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--landing-gold)] px-8 text-sm font-semibold text-[color:var(--landing-navy-deep)] transition-colors hover:bg-[color:var(--landing-paper)] motion-reduce:transition-none"
            >
              {LANDING_FINAL_CTA.cta.label}
            </Link>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
