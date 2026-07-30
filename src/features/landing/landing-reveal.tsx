"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in seconds for the first-screen choreography. */
  delay?: number;
};

/**
 * Client-side reveal wrapper for the public landing page. Server-rendered
 * children are passed through, so section components stay server components.
 * Animates transform/opacity only and disables itself under reduced motion.
 */
export function LandingReveal({
  children,
  className,
  delay = 0,
}: LandingRevealProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  // jsdom (tests) and very old browsers lack IntersectionObserver; render
  // statically there instead of crashing the whole page on a nice-to-have.
  if (shouldReduceMotion || typeof IntersectionObserver === "undefined") {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
