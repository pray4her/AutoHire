/** Allow only same-origin ops paths to avoid open redirects. */
export function resolveSafeOpsNextPath(
  candidate: string | null | undefined,
  fallback: string,
) {
  if (
    !candidate ||
    !candidate.startsWith("/ops/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return fallback;
  }

  return candidate;
}
