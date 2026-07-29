import { describe, expect, it } from "vitest";

import { resolveSafeOpsNextPath } from "@/lib/ops-expert-files/safe-next-path";

describe("resolveSafeOpsNextPath", () => {
  it("keeps allowlisted ops paths", () => {
    expect(resolveSafeOpsNextPath("/ops/invitations", "/ops/expert-files")).toBe(
      "/ops/invitations",
    );
  });

  it("rejects external, non-ops, or unknown ops paths", () => {
    expect(
      resolveSafeOpsNextPath("https://evil.test", "/ops/expert-files"),
    ).toBe("/ops/expert-files");
    expect(resolveSafeOpsNextPath("//evil.test", "/ops/expert-files")).toBe(
      "/ops/expert-files",
    );
    expect(resolveSafeOpsNextPath("/apply", "/ops/expert-files")).toBe(
      "/ops/expert-files",
    );
    expect(resolveSafeOpsNextPath("/ops/referrals", "/ops/expert-files")).toBe(
      "/ops/expert-files",
    );
    expect(
      resolveSafeOpsNextPath("/ops/audit", "/ops/expert-files"),
    ).toBe("/ops/expert-files");
    expect(resolveSafeOpsNextPath(null, "/ops/expert-files")).toBe(
      "/ops/expert-files",
    );
  });
});
