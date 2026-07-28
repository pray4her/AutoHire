"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

import { Card, CardContent } from "@/components/ui/card";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const AMBIENT_ORBS = [
  {
    className:
      "absolute -top-40 -left-32 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(10,25,47,0.16),transparent_65%)] blur-3xl",
    animate: { x: [0, 28, 0], y: [0, 36, 0] },
    transition: { duration: 16, repeat: Infinity, ease: "easeInOut" as const },
  },
  {
    className:
      "absolute -right-36 -bottom-44 size-[32rem] rounded-full bg-[radial-gradient(circle,rgba(22,101,52,0.14),transparent_65%)] blur-3xl",
    animate: { x: [0, -32, 0], y: [0, -28, 0] },
    transition: {
      duration: 18,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay: 1.2,
    },
  },
  {
    className:
      "absolute top-[18%] right-[12%] size-56 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.12),transparent_70%)] blur-2xl",
    animate: { y: [0, 20, 0] },
    transition: {
      duration: 12,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay: 0.6,
    },
  },
];

function AmbientBackground({ animate }: { animate: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Soft vertical wash over the global dot texture. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(244,247,251,0.4),rgba(232,237,244,0.75))]" />

      {/* Faint engineering grid, masked to a glow around the card. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(10,25,47,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,25,47,0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_65%_60%_at_50%_42%,black_30%,transparent_75%)] bg-[size:56px_56px]" />

      {/* Slow-drifting ambient orbs. */}
      {AMBIENT_ORBS.map((orb) => (
        <motion.div
          key={orb.className}
          className={orb.className}
          animate={animate ? orb.animate : undefined}
          transition={orb.transition}
        />
      ))}
    </div>
  );
}

export function AuthPageShell({
  title,
  subtitle,
  children,
}: AuthPageShellProps) {
  const shouldReduceMotion = useReducedMotion();
  const animate = !shouldReduceMotion;

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
      <AmbientBackground animate={animate} />

      <motion.div
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-8"
        variants={containerVariants}
        initial={animate ? "hidden" : false}
        animate="show"
      >
        <header className="flex flex-col items-center gap-4 text-center">
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] text-xl font-semibold text-white shadow-[0_12px_28px_rgba(10,25,47,0.28)]">
              G
            </div>
            <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[color:var(--foreground-soft)] uppercase">
              GESF · Expert Application
            </p>
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="font-heading text-3xl font-semibold tracking-[-0.03em] text-[color:var(--primary)]"
          >
            {title}
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="max-w-sm text-sm leading-6 text-[color:var(--foreground-soft)]"
          >
            {subtitle}
          </motion.p>
        </header>

        <motion.div variants={itemVariants} className="w-full">
          <Card className="rounded-2xl border-[color:var(--border)] bg-[color:var(--background-elevated)]/92 py-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
            <CardContent className="px-6">{children}</CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </main>
  );
}
