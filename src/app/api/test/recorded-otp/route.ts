import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  findLatestRecordedOtp,
  getRecordedEmails,
} from "@/lib/email/transport";

/**
 * Dev/e2e hook: read OTP emails captured when EMAIL_TRANSPORT_MODE=recording.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required." },
      { status: 400 },
    );
  }

  const otp = findLatestRecordedOtp(email);
  if (!otp) {
    return NextResponse.json(
      {
        error: "No recorded OTP for this email.",
        recordedCount: getRecordedEmails().length,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ email, otp });
}
