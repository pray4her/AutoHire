import type { CSSProperties, ReactNode } from "react";

import { BrowserNavigationRecovery } from "@/components/navigation/browser-navigation-recovery";
import { ApplyQaEntry } from "@/features/qa/components/apply-qa-entry";
import { listPublishedQaFaqEntries } from "@/lib/qa/faq-store";

const APPLY_FLOW_BACKDROP_STYLE: CSSProperties = {
  backgroundImage:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(244, 247, 251, 0.78) 38%, rgba(244, 247, 251, 0.7) 100%), url("/apply/entry-background.png")',
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

export default async function ApplyLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const qaEntries = await listPublishedQaFaqEntries();

  return (
    <div className="relative isolate min-h-screen w-full">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={APPLY_FLOW_BACKDROP_STYLE}
      />
      <div className="relative z-10">
        <BrowserNavigationRecovery>
          {children}
          <ApplyQaEntry initialEntries={qaEntries} />
        </BrowserNavigationRecovery>
      </div>
    </div>
  );
}
