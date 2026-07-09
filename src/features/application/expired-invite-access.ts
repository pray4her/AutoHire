import { ApplicationClientError } from "@/features/application/client";

export const EXPIRED_INVITE_APPLY_PATH =
  "/apply?accessError=EXPIRED_TOKEN" as const;

export function isExpiredInviteAccessError(error: unknown) {
  return (
    error instanceof ApplicationClientError && error.code === "EXPIRED_TOKEN"
  );
}

export function redirectToExpiredInviteReadOnly(router: {
  // Narrower than `string` so AppRouterInstance.replace (typed routes) is assignable.
  replace: (href: typeof EXPIRED_INVITE_APPLY_PATH) => void;
}) {
  router.replace(EXPIRED_INVITE_APPLY_PATH);
}
