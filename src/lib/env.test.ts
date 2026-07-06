import { afterEach, describe, expect, it } from "vitest";

import { getEnv, resetEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  resetEnvForTests();
});

describe("getEnv", () => {
  it("allows http app base urls outside production", () => {
    process.env.NODE_ENV = "test";
    process.env.APP_BASE_URL = "http://localhost:3000";

    expect(getEnv().APP_BASE_URL).toBe("http://localhost:3000");
  });

  it("rejects non-https app base urls in production", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_BASE_URL = "http://autohire.test";

    expect(() => getEnv()).toThrowError(
      "APP_BASE_URL must use https in production.",
    );
  });

  it("accepts https app base urls in production", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_BASE_URL = "https://autohire.test";

    expect(getEnv().APP_BASE_URL).toBe("https://autohire.test");
  });
});
