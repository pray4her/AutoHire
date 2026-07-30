import type { Metadata } from "next";

import { LandingAbout } from "@/features/landing/landing-about";
import { LandingBenefits } from "@/features/landing/landing-benefits";
import { LandingEligibility } from "@/features/landing/landing-eligibility";
import { LandingFaq } from "@/features/landing/landing-faq";
import { LandingFinalCta } from "@/features/landing/landing-final-cta";
import { LandingFooter } from "@/features/landing/landing-footer";
import { LandingHero } from "@/features/landing/landing-hero";
import { LandingNav } from "@/features/landing/landing-nav";
import { LandingProcess } from "@/features/landing/landing-process";
import { LandingPrograms } from "@/features/landing/landing-programs";
import { LandingStats } from "@/features/landing/landing-stats";
import { LandingTracker } from "@/features/landing/landing-tracker";
import type { QaFaqEntry } from "@/features/qa/types";
import { listPublishedQaFaqEntries } from "@/lib/qa/faq-store";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Global Excellent Scientists Fund | 2027 Application Support",
  description:
    "The Global Excellent Scientists Fund invites overseas scholars to conduct research and innovation in China. Pre-applications for the 2027 cycle are open.",
};

async function loadFaqEntries(): Promise<readonly QaFaqEntry[]> {
  try {
    return await listPublishedQaFaqEntries();
  } catch {
    // The landing page must never 500 because the FAQ store is unavailable.
    return [];
  }
}

export default async function PublicLandingPage() {
  const faqEntries = await loadFaqEntries();

  return (
    <div className="bg-[color:var(--landing-paper)] text-[color:var(--landing-ink)]">
      <LandingTracker />
      <LandingNav />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingPrograms />
        <LandingBenefits />
        <LandingEligibility />
        <LandingProcess />
        <LandingAbout />
        <LandingFaq entries={faqEntries} />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
