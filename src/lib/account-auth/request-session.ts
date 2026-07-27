import type { AccountSessionIdentity } from "@/features/application/server/apply-entry-access";

/**
 * Resolves the Better Auth session from raw request headers. Returns null
 * when there is no session or when the account track is unavailable (for
 * example no DATABASE_URL in memory mode), so the invitation link track is
 * never broken by account-track failures.
 */
export async function getAccountSessionFromHeaders(
  headers: Headers,
): Promise<AccountSessionIdentity | null> {
  try {
    const { auth } = await import("@/lib/account-auth/auth");
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.email) {
      return null;
    }

    return { userId: session.user.id, email: session.user.email };
  } catch {
    return null;
  }
}
