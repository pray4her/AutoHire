import { NextRequest, NextResponse } from "next/server";

import { resolveClientFacingOrigin } from "@/lib/http";

/** Token link access is retired; use password login at /ops/expert-files/login. */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/ops/expert-files/login", resolveClientFacingOrigin(request)),
    307,
  );
}
