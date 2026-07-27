import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Dev/e2e hook: mark an application listable in the ops expert-files inventory
 * (customerNo + resumeUploadedAt) so referral console / attribution views work
 * in memory mode without forcing a full resume upload first.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    applicationId?: string;
    customerNo?: string;
    email?: string;
  } | null;

  const store = (
    globalThis as typeof globalThis & {
      __autohireStore?: {
        applications: Array<{
          id: string;
          customerNo?: string | null;
          resumeUploadedAt: Date | null;
          invitationId: string;
        }>;
        invitations: Array<{ id: string; email: string | null }>;
      };
    }
  ).__autohireStore;

  if (!store) {
    // Force sample store init.
    const { getApplicationById } = await import("@/lib/data/store");
    await getApplicationById("app_intro");
  }

  const liveStore = (
    globalThis as typeof globalThis & {
      __autohireStore?: {
        applications: Array<{
          id: string;
          customerNo?: string | null;
          resumeUploadedAt: Date | null;
          invitationId: string;
        }>;
        invitations: Array<{ id: string; email: string | null }>;
      };
    }
  ).__autohireStore;

  if (!liveStore) {
    return NextResponse.json({ error: "Memory store unavailable." }, { status: 500 });
  }

  let application = body?.applicationId
    ? liveStore.applications.find((item) => item.id === body.applicationId)
    : null;

  if (!application && body?.email) {
    const invitation = liveStore.invitations.find(
      (item) => item.email === body.email,
    );
    if (invitation) {
      application = liveStore.applications.find(
        (item) => item.invitationId === invitation.id,
      );
    }
  }

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  application.customerNo =
    body?.customerNo?.trim() ||
    application.customerNo ||
    `E2E-${application.id.slice(-8).toUpperCase()}`;
  application.resumeUploadedAt = application.resumeUploadedAt ?? new Date();

  return NextResponse.json({
    ok: true,
    applicationId: application.id,
    customerNo: application.customerNo,
  });
}
