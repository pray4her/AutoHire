import { beforeAll, describe, expect, it, vi } from "vitest";

// The account-auth module builds the Prisma client at import time, so the
// dummy connection string must exist before any import of it (hoisted).
vi.hoisted(() => {
  process.env.DATABASE_URL ??=
    "postgresql://postgres:postgres@localhost:5432/autohire";
});

import { createRecordingEmailSender } from "@/lib/email/transport";
import { resetEnvForTests } from "@/lib/env";
import {
  findOpenApplicationByInvitationId,
  findShadowInvitationByEmail,
} from "@/lib/data/store";
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

  it("creates the shadow invitation and application from the user create hook", async () => {
    const originalMode = process.env.APP_RUNTIME_MODE;
    process.env.APP_RUNTIME_MODE = "memory";
    resetEnvForTests();
    (
      globalThis as typeof globalThis & { __autohireStore?: unknown }
    ).__autohireStore = undefined;

    try {
      const options = createAccountAuthOptions();
      const after = options.databaseHooks?.user?.create?.after;
      expect(after).toBeDefined();

      await after!(
        { id: "user_hook_test", email: "hook@example.com" } as Parameters<
          NonNullable<typeof after>
        >[0],
      );

      const invitation = await findShadowInvitationByEmail("hook@example.com");
      expect(invitation).toMatchObject({
        expertId: "account_user_hook_test",
        email: "hook@example.com",
        source: "ACCOUNT",
        tokenStatus: "ACTIVE",
        expiredAt: null,
      });

      const application = await findOpenApplicationByInvitationId(
        invitation!.id,
      );
      expect(application).toMatchObject({
        invitationId: invitation!.id,
        applicationStatus: "INIT",
      });
    } finally {
      process.env.APP_RUNTIME_MODE = originalMode;
      resetEnvForTests();
    }
  });
});
