/**
 * Integration boundary test for the account track: exercises OUR wiring
 * (Prisma adapter + email callbacks) against a real PostgreSQL database.
 * Better Auth's built-in endpoint correctness is covered upstream and not
 * re-tested here.
 *
 * Gated: only runs when AUTH_DB_TEST_URL is set, e.g.
 *   AUTH_DB_TEST_URL="postgresql://..." bunx vitest run src/lib/account-auth/auth.integration.test.ts
 * The target database must have migrations 0028_better_auth_account_track and
 * 0029_invitation_source applied. The test wipes the four Better Auth tables
 * and the shadow invitation/application rows it creates, before and after.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const RUN = Boolean(process.env.AUTH_DB_TEST_URL);

vi.hoisted(() => {
  if (process.env.AUTH_DB_TEST_URL) {
    process.env.DATABASE_URL = process.env.AUTH_DB_TEST_URL;
    process.env.APP_BASE_URL ??= "http://localhost:3000";
  }
});

import { createRecordingEmailSender } from "@/lib/email/transport";

const BASE_URL = "http://localhost:3000/api/auth";
const TEST_EMAIL = "account-track-integration@example.com";
const INITIAL_PASSWORD = "initial-password-1";
const RESET_PASSWORD = "reset-password-42";

let auth: { handler: (request: Request) => Promise<Response> };
let prisma: typeof import("@/lib/db/prisma").prisma;
let calls: { to: string; subject: string; text: string; html: string }[];

function postJson(path: string, body: unknown, cookie?: string) {
  return auth.handler(
    new Request(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

function sessionCookieFrom(response: Response) {
  const setCookies = response.headers.getSetCookie();
  const sessionCookie = setCookies.find((cookie) =>
    cookie.startsWith("better-auth.session_token="),
  );
  expect(sessionCookie, "session cookie must be set").toBeDefined();
  return sessionCookie!.split(";")[0]!;
}

function latestOtp() {
  const lastCall = calls.at(-1);
  expect(lastCall, "an OTP email must have been sent").toBeDefined();
  const match = lastCall!.text.match(/\b\d{6}\b/);
  expect(match, "OTP email body must contain a 6-digit code").toBeTruthy();
  return match![0];
}

async function wipeAccountAuthTables() {
  await prisma.application.deleteMany({
    where: { invitation: { email: TEST_EMAIL } },
  });
  await prisma.expertInvitation.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
}

describe.skipIf(!RUN)("account-auth integration (real Postgres)", () => {
  beforeAll(async () => {
    const [{ betterAuth }, { createAccountAuthOptions }, prismaModule] =
      await Promise.all([
        import("better-auth"),
        import("@/lib/account-auth/auth"),
        import("@/lib/db/prisma"),
      ]);
    const recording = createRecordingEmailSender();
    calls = recording.calls;
    auth = betterAuth(createAccountAuthOptions(recording.sender));
    prisma = prismaModule.prisma;
    await wipeAccountAuthTables();
  });

  afterAll(async () => {
    await wipeAccountAuthTables();
    await prisma.$disconnect();
  });

  it("runs the full register-verify-login-reset lifecycle", async () => {
    // 1. Register: sign-up persists user+account via the Prisma adapter and
    //    triggers our verification-email callback.
    const signUpResponse = await postJson("/sign-up/email", {
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
      name: "integration-tester",
    });
    expect(signUpResponse.status).toBe(200);

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(user).not.toBeNull();
    expect(user!.emailVerified).toBe(false);
    const credentialAccount = await prisma.account.findFirst({
      where: { userId: user!.id, providerId: "credential" },
    });
    expect(credentialAccount?.password).toBeTruthy();
    expect(credentialAccount?.password).not.toBe(INITIAL_PASSWORD);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.to).toBe(TEST_EMAIL);
    const registrationOtp = latestOtp();

    // 1c. Registration bootstraps the account-track application context: a
    //     shadow invitation bound to the registered email (source ACCOUNT,
    //     token never exposed) plus the INIT application attached to it.
    const shadowInvitation = await prisma.expertInvitation.findFirst({
      where: { email: TEST_EMAIL, source: "ACCOUNT" },
    });
    expect(shadowInvitation).not.toBeNull();
    expect(shadowInvitation!.tokenStatus).toBe("ACTIVE");
    expect(shadowInvitation!.expiredAt).toBeNull();
    const shadowApplication = await prisma.application.findUnique({
      where: { invitationId: shadowInvitation!.id },
    });
    expect(shadowApplication).toMatchObject({
      expertId: `account_${user!.id}`,
      applicationStatus: "INIT",
    });

    // 1b. Sign-in before verification is rejected (the login form relies on
    //     this 403 to offer resending the code).
    const unverifiedSignInResponse = await postJson("/sign-in/email", {
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
    });
    expect(unverifiedSignInResponse.status).toBe(403);

    // 2. Verify email: OTP check flips emailVerified and auto-signs in.
    const verifyResponse = await postJson("/email-otp/verify-email", {
      email: TEST_EMAIL,
      otp: registrationOtp,
    });
    expect(verifyResponse.status).toBe(200);
    const verifiedCookie = sessionCookieFrom(verifyResponse);

    const verifiedUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(verifiedUser!.emailVerified).toBe(true);

    // 3. Session is live (auto-login after registration).
    const sessionResponse = await auth.handler(
      new Request(`${BASE_URL}/get-session`, {
        headers: { cookie: verifiedCookie },
      }),
    );
    expect(sessionResponse.status).toBe(200);
    const sessionBody = await sessionResponse.json();
    expect(sessionBody.user.email).toBe(TEST_EMAIL);

    // 4. Sign out invalidates the session.
    const signOutResponse = await postJson("/sign-out", {}, verifiedCookie);
    expect(signOutResponse.status).toBe(200);
    const sessionAfterSignOut = await auth.handler(
      new Request(`${BASE_URL}/get-session`, {
        headers: { cookie: verifiedCookie },
      }),
    );
    expect(await sessionAfterSignOut.json()).toBeNull();

    // 5. Login: wrong password rejected, correct password accepted.
    const wrongPasswordResponse = await postJson("/sign-in/email", {
      email: TEST_EMAIL,
      password: "not-the-password",
    });
    expect(wrongPasswordResponse.status).toBe(401);

    const signInResponse = await postJson("/sign-in/email", {
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
    });
    expect(signInResponse.status).toBe(200);
    sessionCookieFrom(signInResponse);

    // 6. Forgot password: OTP arrives through our email channel, reset works.
    const forgotResponse = await postJson("/email-otp/send-verification-otp", {
      email: TEST_EMAIL,
      type: "forget-password",
    });
    expect(forgotResponse.status).toBe(200);
    const resetOtp = latestOtp();

    const resetResponse = await postJson("/email-otp/reset-password", {
      email: TEST_EMAIL,
      otp: resetOtp,
      password: RESET_PASSWORD,
    });
    expect(resetResponse.status).toBe(200);

    const oldPasswordResponse = await postJson("/sign-in/email", {
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
    });
    expect(oldPasswordResponse.status).toBe(401);

    const newPasswordResponse = await postJson("/sign-in/email", {
      email: TEST_EMAIL,
      password: RESET_PASSWORD,
    });
    expect(newPasswordResponse.status).toBe(200);
  });
});
