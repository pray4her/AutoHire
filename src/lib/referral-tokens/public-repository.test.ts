import { describe, expect, it } from "vitest";

import { parsePublicReferralDisplayFields } from "@/lib/referral-tokens/public-repository";

describe("public referral display-field parsing", () => {
  it.each([
    { scenario: "empty", fields: [] },
    { scenario: "duplicate", fields: ["NAME", "EMAIL", "EMAIL"] },
    { scenario: "missing NAME", fields: ["TITLE", "EMAIL"] },
  ])("fails closed for $scenario persisted configuration", ({ fields }) => {
    expect(parsePublicReferralDisplayFields(fields)).toBeNull();
  });

  it("accepts a valid ops-selected field set", () => {
    expect(parsePublicReferralDisplayFields(["NAME", "EMAIL"])).toEqual([
      "NAME",
      "EMAIL",
    ]);
  });
});
