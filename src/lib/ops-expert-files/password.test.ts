import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/ops-expert-files/password";

describe("ops expert-files password hashing", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("secret-password");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("secret-password", hash)).toBe(true);
    expect(await verifyPassword("other-password", hash)).toBe(false);
  });
});
