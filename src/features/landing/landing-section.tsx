import type { ReactNode } from "react";

/** Shared eyebrow label style for landing sections (gold, sans, wide tracking). */
export function LandingEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-[0.3em] text-[color:var(--landing-gold-strong)] uppercase">
      {children}
    </p>
  );
}

/** Shared section heading (display serif). Dark sections need their own variant. */
export function LandingSectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[color:var(--landing-ink)] sm:text-4xl"
    >
      {children}
    </h2>
  );
}

type LandingSectionProps = {
  id?: string;
  /** Value reported by LandingTracker as the section exposure id. */
  trackSection: string;
  labelledBy?: string;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
};

/** Paper-background section shell: centered container, consistent rhythm. */
export function LandingSection({
  id,
  trackSection,
  labelledBy,
  ariaLabel,
  className,
  children,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      data-track-section={trackSection}
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      className={className}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
        {children}
      </div>
    </section>
  );
}
