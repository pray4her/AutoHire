import Link from "next/link";

import { LANDING_NAV_ITEMS, LANDING_PRIMARY_CTA } from "./landing-content";

/**
 * Sticky top navigation. Server component: anchor links wrap/scroll on small
 * screens instead of a JS hamburger menu.
 */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--landing-hairline)] bg-[color:var(--landing-paper)]/90 backdrop-blur-sm">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 px-6 py-3"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[color:var(--landing-ink)]"
        >
          GESF
        </Link>
        <ul className="flex flex-wrap items-center gap-x-1 text-sm text-[color:var(--landing-ink-soft)] sm:gap-x-2">
          {LANDING_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="inline-flex min-h-11 items-center rounded-full px-3 transition-colors hover:text-[color:var(--landing-ink)] motion-reduce:transition-none"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href={LANDING_PRIMARY_CTA.href}
          data-track-cta="nav_primary"
          className="ml-auto inline-flex min-h-11 items-center rounded-full bg-[color:var(--landing-navy)] px-5 text-sm font-medium text-[color:var(--landing-paper)] transition-colors hover:bg-[color:var(--landing-navy-deep)] motion-reduce:transition-none"
        >
          {LANDING_PRIMARY_CTA.label}
        </Link>
      </nav>
    </header>
  );
}
