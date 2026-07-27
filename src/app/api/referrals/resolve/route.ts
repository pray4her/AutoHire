import { type NextRequest, NextResponse } from "next/server";

import {
  referralRequestContextFromHeaders,
  resolvePublicReferral,
} from "@/lib/referral-tokens/public-service";

const unavailableResponse = () =>
  NextResponse.json(
    { status: "UNAVAILABLE", code: "REFERRAL_LINK_UNAVAILABLE" },
    { status: 410 },
  );

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const result = await resolvePublicReferral(
    token,
    referralRequestContextFromHeaders(request.headers),
  );
  if (result.status === "UNAVAILABLE") {
    return unavailableResponse();
  }

  return NextResponse.json(result);
}
