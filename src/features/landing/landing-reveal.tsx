import type { CSSProperties, ReactNode } from "react";

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in seconds for the first-screen choreography. */
  delay?: number;
};

/**
 * Reveal wrapper for the public landing page. Pure CSS animation (see
 * `.landing-reveal` in globals.css): no client JS, no hydration branch, and
 * content stays visible even if scripts fail. Honors prefers-reduced-motion.
 */
export function LandingReveal({
  children,
  className,
  delay = 0,
}: LandingRevealProps) {
  return (
    <div
      className={className ? `landing-reveal ${className}` : "landing-reveal"}
      style={{ "--landing-reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
