import { describe, expect, it } from "vitest";

import {
  readInviteTokenFromSearchParams,
  removeInviteTokenFromUrl,
} from "@/features/application/invite-url-token";

describe("supplement deep link invite token hygiene", () => {
  it("reads t query param and removes it from supplement URLs", () => {
    const token = readInviteTokenFromSearchParams(
      new URLSearchParams("t=plain-token-123"),
    );

    expect(token).toBe("plain-token-123");
    expect(
      removeInviteTokenFromUrl(
        "https://example.test/apply/supplement?t=plain-token-123",
      ),
    ).toBe("/apply/supplement");
  });
});
