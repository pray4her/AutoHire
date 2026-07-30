import { LANDING_ABOUT_SECTION, LANDING_DISCLOSURE } from "./landing-content";
import { LandingReveal } from "./landing-reveal";
import {
  LandingEyebrow,
  LandingSection,
  LandingSectionHeading,
} from "./landing-section";

export function LandingAbout() {
  const { contact } = LANDING_ABOUT_SECTION;

  return (
    <LandingSection
      trackSection="about"
      labelledBy="landing-about-title"
      className="border-y border-[color:var(--landing-hairline)] bg-[color:var(--landing-paper-raised)]"
    >
      <LandingReveal>
        <LandingEyebrow>{LANDING_ABOUT_SECTION.eyebrow}</LandingEyebrow>
        <LandingSectionHeading id="landing-about-title">
          {LANDING_ABOUT_SECTION.title}
        </LandingSectionHeading>
        <p className="mt-6 max-w-3xl font-[family-name:var(--font-serif)] text-lg leading-relaxed text-[color:var(--landing-ink-soft)]">
          {LANDING_ABOUT_SECTION.whoWeAre}
        </p>
      </LandingReveal>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {LANDING_ABOUT_SECTION.coreServices.map((service, index) => (
          <LandingReveal key={service.title} delay={index * 0.08}>
            <article className="flex h-full flex-col rounded-2xl border border-[color:var(--landing-hairline)] bg-[color:var(--landing-paper)] p-8">
              <h3 className="text-lg font-semibold text-[color:var(--landing-ink)]">
                {service.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[color:var(--landing-ink-soft)]">
                {service.description}
              </p>
            </article>
          </LandingReveal>
        ))}
      </div>
      <LandingReveal delay={0.12}>
        <ul className="mt-10 flex flex-wrap gap-3">
          {LANDING_ABOUT_SECTION.valueAddedServices.map((service) => (
            <li
              key={service}
              className="rounded-full border border-[color:var(--landing-hairline)] px-4 py-2 text-sm text-[color:var(--landing-ink-soft)]"
            >
              {service}
            </li>
          ))}
        </ul>
      </LandingReveal>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <LandingReveal delay={0.08}>
          <a
            href={`mailto:${contact.email}`}
            data-track-cta="about_email"
            className="flex min-h-11 flex-col rounded-2xl border border-[color:var(--landing-hairline)] bg-[color:var(--landing-paper)] p-6 transition-colors hover:border-[color:var(--landing-gold)] motion-reduce:transition-none"
          >
            <span className="text-xs font-medium tracking-[0.2em] text-[color:var(--landing-gold-strong)] uppercase">
              Email
            </span>
            <span className="mt-2 text-base font-medium text-[color:var(--landing-ink)]">
              {contact.email}
            </span>
          </a>
        </LandingReveal>
        <LandingReveal delay={0.16}>
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            data-track-cta="about_whatsapp"
            className="flex min-h-11 flex-col rounded-2xl border border-[color:var(--landing-hairline)] bg-[color:var(--landing-paper)] p-6 transition-colors hover:border-[color:var(--landing-gold)] motion-reduce:transition-none"
          >
            <span className="text-xs font-medium tracking-[0.2em] text-[color:var(--landing-gold-strong)] uppercase">
              WhatsApp
            </span>
            <span className="mt-2 text-base font-medium text-[color:var(--landing-ink)]">
              {contact.whatsappDisplay}
            </span>
          </a>
        </LandingReveal>
      </div>
      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-[color:var(--landing-ink-soft)]">
        {LANDING_DISCLOSURE}
      </p>
    </LandingSection>
  );
}
