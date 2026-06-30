import { describe, expect, it } from "vitest";

import { resolveReportEmailRecipient } from "@/lib/initial-material-review-report-email/resolve-recipient";

describe("resolveReportEmailRecipient", () => {
  it("prefers invitation email, then screening contact, then work email", () => {
    expect(
      resolveReportEmailRecipient({
        invitationEmail: " invite@example.com ",
        screeningContactEmail: "personal@example.com",
        screeningWorkEmail: "work@example.com",
      }),
    ).toBe("invite@example.com");

    expect(
      resolveReportEmailRecipient({
        invitationEmail: null,
        screeningContactEmail: "personal@example.com",
        screeningWorkEmail: "work@example.com",
      }),
    ).toBe("personal@example.com");

    expect(
      resolveReportEmailRecipient({
        invitationEmail: "",
        screeningContactEmail: " ",
        screeningWorkEmail: "work@example.com",
      }),
    ).toBe("work@example.com");
  });

  it("returns null when no valid recipient exists", () => {
    expect(
      resolveReportEmailRecipient({
        invitationEmail: null,
        screeningContactEmail: "not-an-email",
        screeningWorkEmail: "",
      }),
    ).toBeNull();
  });
});
