import { NextRequest, NextResponse } from "next/server";

import { clearOpsExpertFilesSessionCookie } from "@/lib/ops-expert-files/cookie";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearOpsExpertFilesSessionCookie(response, request);
  return response;
}
