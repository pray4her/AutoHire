import { beforeAll, describe, expect, it, vi } from "vitest";

// The account-auth module builds the Prisma client at import time, so the
// dummy connection string must exist before any import of it (hoisted).
vi.hoisted(() => {
  process.env.DATABASE_URL ??=
    "postgresql://postgres:postgres@localhost:5432/autohire";
});

import { createRecordingEmailSender } from "@/lib/email/transport";
import {
  ACCOUNT_AUTH_OTP_EXPIRES_IN_SECONDS,
  ACCOUNT_AUTH_SESSION_EXPIRES_IN_SECONDS,
} from "@/lib/account-auth/auth";

type AccountAuthOptions = ReturnType<
  typeof import("@/lib/account-auth/auth").createAccountAuthOptions
>;

let createAccountAuthOptions: (
  sender?: Parameters<
    typeof import("@/lib/account-auth/auth").createAccountAuthOptions
  >[0],
) => AccountAuthOptions;

beforeAll(async () => {
  ({ createAccountAuthOptions } = await import("@/lib/account-auth/auth"));
});

describe("createAccountAuthOptions", () => {
  it("wires the Prisma adapter as the database boundary", () => {
    const options = createAccountAuthOptions();

    expect(typeof options.database).toBe("function");
  });

  it("enables email+password with required verification and sane session TTL", () => {
    const options = createAccountAuthOptions();

    expect(options.emailAndPassword?.enabled).toBe(true);
    expect(options.emailAndPassword?.requireEmailVerification).toBe(true);
    expect(options.session?.expiresIn).toBe(
      ACCOUNT_AUTH_SESSION_EXPIRES_IN_SECONDS,
    );
  });

  it("sends verification OTPs through the injected email sender", async () => {
    const { sender, calls } = createRecordingEmailSender();
    const options = createAccountAuthOptions(sender);
    const emailOtpPlugin = options.plugins?.find(
      (plugin) => plugin.id === "email-otp",
    );

    expect(emailOtpPlugin).toBeDefined();

    const sendVerificationOTP = (
      emailOtpPlugin as unknown as {
        options: {
          expiresIn: number;
          sendVerificationOTP: (data: {
            email: string;
            otp: string;
            type: "email-verification";
          }) => Promise<void>;
        };
      }
    ).options.sendVerificationOTP;

    expect(
      (emailOtpPlugin as unknown as { options: { expiresIn: number } }).options
        .expiresIn,
    ).toBe(ACCOUNT_AUTH_OTP_EXPIRES_IN_SECONDS);

    await sendVerificationOTP({
      email: "new-expert@example.com",
      otp: "112233",
      type: "email-verification",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.to).toBe("new-expert@example.com");
    expect(calls[0]?.subject).toContain("112233");
  });
});
