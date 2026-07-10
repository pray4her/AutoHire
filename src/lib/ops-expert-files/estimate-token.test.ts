import { describe, expect, it } from "vitest";

import {
  hashApplicationIds,
  signEstimateToken,
  verifyEstimateToken,
} from "@/lib/ops-expert-files/estimate-token";

describe("estimate token", () => {
  it("round-trips a signed token", () => {
    const ids = ["app_b", "app_a"];
    const token = signEstimateToken({
      mode: "ids",
      applicationIdsHash: hashApplicationIds(ids),
      exportableCount: 2,
      excludedEmptyCount: 0,
      estimatedBytes: 100,
    });

    const payload = verifyEstimateToken(token);
    expect(payload.mode).toBe("ids");
    expect(payload.exportableCount).toBe(2);
    expect(payload.applicationIdsHash).toBe(hashApplicationIds(ids));
  });
});
