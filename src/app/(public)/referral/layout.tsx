import type { ReactNode } from "react";

import { ApplyFlowChrome } from "@/features/application/components/apply-flow-chrome";

export default function ReferralLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <ApplyFlowChrome>{children}</ApplyFlowChrome>;
}
