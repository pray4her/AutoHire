import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins/email-otp";

import { prisma } from "@/lib/db/prisma";
import type { EmailSender } from "@/lib/email/transport";
import { createEmailSenderFromEnv } from "@/lib/email/transport";
import { getEnv } from "@/lib/env";
import { sendAccountAuthOtpEmail } from "@/lib/account-auth/emails";
import { ensureAccountApplication } from "@/lib/account-auth/shadow-invitation";
import { readReferralPlaintextFromCookieHeader } from "@/lib/referral-tokens/context-cookie";

export const ACCOUNT_AUTH_OTP_EXPIRES_IN_SECONDS = 600;
export const ACCOUNT_AUTH_SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
export const ACCOUNT_AUTH_SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

/**
 * Better Auth options for the account track (open email+password
 * registration). The sender is injectable so tests can assert outgoing
 * verification / reset emails with the recording fake.
 */
export function createAccountAuthOptions(sender?: EmailSender) {
  const env = getEnv();

  return {
    appName: env.APP_NAME,
    baseURL: env.BETTER_AUTH_URL ?? env.APP_BASE_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    databaseHooks: {
      user: {
        create: {
          // Registration bootstraps the account-track application context:
          // a shadow invitation bound to the registered email plus the
          // application attached to it. A failure here must not block the
          // sign-up response — the apply-entry account branch re-ensures the
          // context lazily on first visit.
          after: async (user, ctx) => {
            try {
              const referralPlaintextToken =
                readReferralPlaintextFromCookieHeader(
                  ctx?.request?.headers?.get("cookie"),
                );
              await ensureAccountApplication({
                userId: user.id,
                email: user.email,
                referralPlaintextToken,
              });
            } catch (error) {
              console.error(
                "[account-auth] failed to create shadow invitation",
                error,
              );
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
    },
    emailVerification: {
      // Registration should land the user in a signed-in state right after
      // the OTP check succeeds.
      autoSignInAfterVerification: true,
    },
    session: {
      expiresIn: ACCOUNT_AUTH_SESSION_EXPIRES_IN_SECONDS,
      updateAge: ACCOUNT_AUTH_SESSION_UPDATE_AGE_SECONDS,
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: ACCOUNT_AUTH_OTP_EXPIRES_IN_SECONDS,
        storeOTP: "hashed",
        sendVerificationOnSignUp: true,
        overrideDefaultEmailVerification: true,
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendAccountAuthOtpEmail({
            sender: sender ?? createEmailSenderFromEnv(),
            email,
            otp,
            type,
            appName: env.APP_NAME,
            expiresInMinutes: ACCOUNT_AUTH_OTP_EXPIRES_IN_SECONDS / 60,
          });
        },
      }),
    ],
  } satisfies BetterAuthOptions;
}

export const auth = betterAuth(createAccountAuthOptions());
