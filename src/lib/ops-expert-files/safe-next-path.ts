import type { Route } from "next";

/** Allowed post-login destinations for shared ops password login. */
export const OPS_LOGIN_REDIRECT_TARGETS = [
  "/ops/expert-files",
  "/ops/invitations",
] as const satisfies ReadonlyArray<Route>;

export type OpsLoginRedirectTarget =
  (typeof OPS_LOGIN_REDIRECT_TARGETS)[number];

/** Allow only known ops destinations to avoid open redirects. */
export function resolveSafeOpsNextPath(
  candidate: string | null | undefined,
  fallback: OpsLoginRedirectTarget,
): OpsLoginRedirectTarget {
  if (
    candidate &&
    (OPS_LOGIN_REDIRECT_TARGETS as readonly string[]).includes(candidate)
  ) {
    return candidate as OpsLoginRedirectTarget;
  }

  return fallback;
}
