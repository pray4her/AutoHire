import { describe, expect, it } from "vitest";

import { toReferralProgressStage } from "@/lib/referral-tokens/progress-stage";
import { toReferralTokenView, type ReferralTokenRecord } from "@/lib/referral-tokens/types";

describe("toReferralProgressStage", () => {
  it("maps statuses to coarse ops labels", () => {
    expect(toReferralProgressStage("INIT")).toBe("已注册未上传");
    expect(toReferralProgressStage("CV_UPLOADED")).toBe("简历中");
    expect(toReferralProgressStage("SUBMITTED")).toBe("已提交");
  });
});

describe("toReferralTokenView", () => {
  it("marks time-expired ACTIVE tokens as EXPIRED", () => {
    const record: ReferralTokenRecord = {
      id: "rt-1",
      referrerEmail: "a@example.com",
      referrerDisplayName: null,
      tokenHash: "hash",
      plaintextToken: "a".repeat(64),
      status: "ACTIVE",
      expiredAt: new Date(Date.now() - 1000),
      createdBy: "ops",
      createdAt: new Date(Date.now() - 10_000),
      updatedAt: new Date(Date.now() - 10_000),
    };
    expect(toReferralTokenView(record).status).toBe("EXPIRED");
  });
});
