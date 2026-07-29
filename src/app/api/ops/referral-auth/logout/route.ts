import { NextRequest, NextResponse } from "next/server";

import { clearOpsReferralSessionCookie } from "@/lib/ops-referral-auth/cookie";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearOpsReferralSessionCookie(response, request);
  return response;
}
