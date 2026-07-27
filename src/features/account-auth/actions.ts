"use server";

import { cookies } from "next/headers";

import {
  isReferralPlaintextToken,
  referralContextCookieOptions,
  REFERRAL_CONTEXT_COOKIE_NAME,
} from "@/lib/referral-tokens/context-cookie";

/**
 * Persists a short-lived referral context cookie when signup is opened with
 * `?referral=`. Safe no-op for invalid tokens so deep links never error.
 */
export async function captureReferralContextAction(
  referralPlaintextToken: string,
): Promise<void> {
  if (!isReferralPlaintextToken(referralPlaintextToken)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    REFERRAL_CONTEXT_COOKIE_NAME,
    referralPlaintextToken,
    referralContextCookieOptions(process.env.NODE_ENV === "production"),
  );
}
