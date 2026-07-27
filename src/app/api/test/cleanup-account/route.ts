import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Dev/e2e hook: delete a Better Auth user (and cascaded sessions/accounts)
 * plus verification rows for the email. Memory-mode shadow invitations are
 * cleared separately by `/api/test/reset-memory`.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/db/prisma");
  await prisma.verification.deleteMany({
    where: { identifier: email },
  });
  const deleted = await prisma.user.deleteMany({
    where: { email },
  });

  return NextResponse.json({ ok: true, deletedUsers: deleted.count });
}
