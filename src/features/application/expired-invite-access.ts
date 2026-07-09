import { ApplicationClientError } from "@/features/application/client";

export const EXPIRED_INVITE_APPLY_PATH =
  "/apply?accessError=EXPIRED_TOKEN" as const;

export function isExpiredInviteAccessError(error: unknown) {
  return (
    error instanceof ApplicationClientError && error.code === "EXPIRED_TOKEN"
  );
}

export function redirectToExpiredInviteReadOnly(router: {
  replace: (href: string) => void;
}) {
  router.replace(EXPIRED_INVITE_APPLY_PATH);
}
