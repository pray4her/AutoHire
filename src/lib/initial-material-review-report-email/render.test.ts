import { describe, expect, it } from "vitest";

import { SUBMISSION_COMPLETE_CONTACT_EMAIL } from "@/features/application/constants";
import { INITIAL_MATERIAL_REVIEW_ELIGIBILITY_HEADLINE } from "@/lib/initial-material-review-report-email/constants";
import { renderInitialMaterialReviewReportEmail } from "@/lib/initial-material-review-report-email/render";
import type { InitialMaterialReviewReportPayload } from "@/lib/initial-material-review-report-email/types";

const basePayload: InitialMaterialReviewReportPayload = {
  eligibility: {
    headline: INITIAL_MATERIAL_REVIEW_ELIGIBILITY_HEADLINE,
    displaySummary: "Strong research background.",
  },
  categorySummary: [
    { category: "IDENTITY", outcome: "COMPLETE" },
    { category: "EDUCATION", outcome: "SUPPLEMENT_REQUIRED" },
    { category: "EMPLOYMENT", outcome: "COMPLETE" },
    { category: "PROJECT", outcome: "COMPLETE" },
    { category: "PATENT", outcome: "COMPLETE" },
    { category: "HONOR", outcome: "COMPLETE" },
  ],
  pendingRequests: [],
  inviteTokenAvailable: false,
  supplementDeepLink: null,
};

describe("renderInitialMaterialReviewReportEmail", () => {
  it("renders subject, eligibility headline, and six category summaries", () => {
    const rendered = renderInitialMaterialReviewReportEmail(
      basePayload,
      "Dr. Jane Doe",
    );

    expect(rendered.subject).toBe(
      "Your GESF Application — Initial Material Review Report",
    );
    expect(rendered.text).toContain(INITIAL_MATERIAL_REVIEW_ELIGIBILITY_HEADLINE);
    expect(rendered.text).toContain("Strong research background.");
    expect(rendered.text).toContain("Identity Documents: Complete");
    expect(rendered.text).toContain("Education Documents: Supplement required");
    expect(rendered.html).toContain("Review summary");
    expect(rendered.text).toContain(SUBMISSION_COMPLETE_CONTACT_EMAIL);
  });

  it("states no additional materials when there are no pending requests", () => {
    const rendered = renderInitialMaterialReviewReportEmail(basePayload);

    expect(rendered.text).toContain(
      "No additional materials are required at this time.",
    );
    expect(rendered.html).toContain(
      "No additional materials are required at this time.",
    );
  });

  it("includes action section and upload CTA when pending requests exist", () => {
    const rendered = renderInitialMaterialReviewReportEmail({
      ...basePayload,
      pendingRequests: [
        {
          category: "EDUCATION",
          title: "Upload degree certificate",
          reason: "Degree proof is missing",
          suggestedMaterials: ["Degree certificate"],
          aiMessage: "Please upload a clear scan.",
        },
      ],
      inviteTokenAvailable: true,
      supplementDeepLink: "https://example.test/apply/supplement?t=abc",
    });

    expect(rendered.text).toContain("Upload degree certificate");
    expect(rendered.text).toContain("Upload supplement materials");
    expect(rendered.html).toContain(
      'href="https://example.test/apply/supplement?t=abc"',
    );
  });

  it("uses degraded guidance when invite token is unavailable", () => {
    const rendered = renderInitialMaterialReviewReportEmail({
      ...basePayload,
      pendingRequests: [
        {
          category: "EDUCATION",
          title: "Upload degree certificate",
          reason: "Degree proof is missing",
          suggestedMaterials: [],
        },
      ],
      inviteTokenAvailable: false,
    });

    expect(rendered.text).toContain("original invitation link");
    expect(rendered.html).not.toContain("href=");
  });
});
