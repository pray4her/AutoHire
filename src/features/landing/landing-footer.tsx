import Link from "next/link";

import { LANDING_FOOTER } from "./landing-content";

export function LandingFooter() {
  const year = new Date().getFullYear();
  const { contact } = LANDING_FOOTER;

  return (
    <footer className="bg-[color:var(--landing-navy-deep)] text-[color:var(--landing-paper)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              {LANDING_FOOTER.companyName}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--landing-paper)]/80">
              {LANDING_FOOTER.disclosure}
            </p>
          </div>
          <div className="text-sm">
            <p className="text-xs font-medium tracking-[0.2em] text-[color:var(--landing-gold)] uppercase">
              Contact
            </p>
            <ul className="mt-4 space-y-2 text-[color:var(--landing-paper)]/85">
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex min-h-11 items-center transition-colors hover:text-[color:var(--landing-paper)] motion-reduce:transition-none"
                >
                  {contact.email}
                </a>
              </li>
              <li>
                <a
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-[color:var(--landing-paper)] motion-reduce:transition-none"
                >
                  WhatsApp: {contact.whatsappDisplay}
                </a>
              </li>
              <li>
                <Link
                  href={LANDING_FOOTER.applyEntryLink.href}
                  className="inline-flex min-h-11 items-center text-[color:var(--landing-gold)] transition-colors hover:text-[color:var(--landing-paper)] motion-reduce:transition-none"
                >
                  {LANDING_FOOTER.applyEntryLink.label}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-12 border-t border-[color:var(--landing-hairline-light)] pt-6 text-xs text-[color:var(--landing-paper)]/60">
          © {year} {LANDING_FOOTER.companyName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
