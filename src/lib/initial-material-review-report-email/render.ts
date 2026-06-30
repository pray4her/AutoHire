import { SUBMISSION_COMPLETE_CONTACT_EMAIL } from "@/features/application/constants";
import { SUPPLEMENT_CATEGORY_LABELS } from "@/features/material-supplement/constants";
import type { SupplementCategory } from "@/features/material-supplement/types";
import { INITIAL_MATERIAL_REVIEW_REPORT_EMAIL_SUBJECT } from "@/lib/initial-material-review-report-email/constants";
import type { InitialMaterialReviewReportPayload } from "@/lib/initial-material-review-report-email/types";

export type RenderedInitialMaterialReviewReportEmail = {
  subject: string;
  text: string;
  html: string;
};

function formatCategoryLine(category: string, outcome: string) {
  const label =
    SUPPLEMENT_CATEGORY_LABELS[category as SupplementCategory] ?? category;
  const outcomeLabel =
    outcome === "SUPPLEMENT_REQUIRED" ? "Supplement required" : "Complete";

  return `- ${label}: ${outcomeLabel}`;
}

function renderPendingSection(payload: InitialMaterialReviewReportPayload) {
  if (payload.pendingRequests.length === 0) {
    return {
      text: "No additional materials are required at this time.",
      html: "<p>No additional materials are required at this time.</p>",
    };
  }

  const textItems = payload.pendingRequests.map((request) => {
    const materials =
      request.suggestedMaterials.length > 0
        ? `\nSuggested materials: ${request.suggestedMaterials.join(", ")}`
        : "";
    const aiMessage = request.aiMessage
      ? `\n${request.aiMessage}`
      : "";

    return `- ${request.title}\nReason: ${request.reason}${materials}${aiMessage}`;
  });

  const htmlItems = payload.pendingRequests
    .map((request) => {
      const materials =
        request.suggestedMaterials.length > 0
          ? `<p><strong>Suggested materials:</strong> ${request.suggestedMaterials.join(", ")}</p>`
          : "";
      const aiMessage = request.aiMessage
        ? `<p>${request.aiMessage}</p>`
        : "";

      return `<li><strong>${request.title}</strong><p>${request.reason}</p>${materials}${aiMessage}</li>`;
    })
    .join("");

  return {
    text: ["Action required:", ...textItems].join("\n\n"),
    html: `<h2>Action required</h2><ul>${htmlItems}</ul>`,
  };
}

function renderCta(payload: InitialMaterialReviewReportPayload) {
  const hasPending = payload.pendingRequests.length > 0;

  if (payload.inviteTokenAvailable && payload.supplementDeepLink) {
    const label = hasPending
      ? "Upload supplement materials"
      : "View application status";

    return {
      text: `${label}: ${payload.supplementDeepLink}`,
      html: `<p><a href="${payload.supplementDeepLink}">${label}</a></p>`,
    };
  }

  return {
    text: "Please use your original invitation link to continue your application.",
    html:
      "<p>Please use your original invitation link to continue your application.</p>",
  };
}

export function renderInitialMaterialReviewReportEmail(
  payload: InitialMaterialReviewReportPayload,
  greetingName?: string | null,
): RenderedInitialMaterialReviewReportEmail {
  const greeting = greetingName?.trim()
    ? `Dear ${greetingName.trim()},`
    : "Dear Applicant,";
  const eligibilitySummary = payload.eligibility?.displaySummary?.trim()
    ? `\n\n${payload.eligibility.displaySummary.trim()}`
    : "";
  const categoryLines = payload.categorySummary.map((item) =>
    formatCategoryLine(item.category, item.outcome),
  );
  const pendingSection = renderPendingSection(payload);
  const cta = renderCta(payload);
  const footer = `If you need assistance, contact us at ${SUBMISSION_COMPLETE_CONTACT_EMAIL}.`;

  const text = [
    greeting,
    "",
    payload.eligibility?.headline ?? "",
    eligibilitySummary,
    "",
    "Review summary:",
    ...categoryLines,
    "",
    pendingSection.text,
    "",
    cta.text,
    "",
    footer,
  ]
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body>
    <p>${greeting}</p>
    <p>${payload.eligibility?.headline ?? ""}</p>
    ${
      payload.eligibility?.displaySummary
        ? `<p>${payload.eligibility.displaySummary}</p>`
        : ""
    }
    <h2>Review summary</h2>
    <ul>
      ${payload.categorySummary
        .map((item) => `<li>${formatCategoryLine(item.category, item.outcome).slice(2)}</li>`)
        .join("")}
    </ul>
    ${pendingSection.html}
    ${cta.html}
    <p>${footer}</p>
  </body>
</html>`;

  return {
    subject: INITIAL_MATERIAL_REVIEW_REPORT_EMAIL_SUBJECT,
    text,
    html,
  };
}
