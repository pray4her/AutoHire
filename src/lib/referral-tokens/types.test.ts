import { describe, expect, it } from "vitest";

import {
  type ReferralTokenRecord,
  toReferralTokenView,
} from "@/lib/referral-tokens/types";

describe("toReferralTokenView", () => {
  it("reports an active database record as expired after its deadline", () => {
    const record: ReferralTokenRecord = {
      id: "referral-token-expired",
      applicationId: "application-1",
      expertId: "expert-1",
      tokenHash: "hash",
      displayFields: ["NAME"],
      status: "ACTIVE",
      expiredAt: new Date("2000-01-01T00:00:00.000Z"),
      createdBy: "ops",
      createdAt: new Date("1999-01-01T00:00:00.000Z"),
      updatedAt: new Date("1999-01-01T00:00:00.000Z"),
    };

    expect(toReferralTokenView(record).status).toBe("EXPIRED");
  });
});
