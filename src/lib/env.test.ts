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
    process.env.BETTER_AUTH_SECRET = "production-secret-at-least-32-chars-long";

    expect(getEnv().APP_BASE_URL).toBe("https://autohire.test");
  });

  it("rejects the default better-auth secret in production", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_BASE_URL = "https://autohire.test";
    delete process.env.BETTER_AUTH_SECRET;

    expect(() => getEnv()).toThrowError(
      "BETTER_AUTH_SECRET must be set to a unique secret in production.",
    );
  });

  it("rejects recording email transport in production", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_BASE_URL = "https://autohire.test";
    process.env.BETTER_AUTH_SECRET = "production-secret-at-least-32-chars-long";
    process.env.EMAIL_TRANSPORT_MODE = "recording";

    expect(() => getEnv()).toThrowError(
      "EMAIL_TRANSPORT_MODE=recording is not allowed in production.",
    );
  });
});
