import type { ApplicationSnapshot } from "@/features/application/types";

const INVITE_NOTICE_STORAGE_KEY_PREFIX = "apply-invite-notice-seen";

export function buildInviteNoticeStorageKey(
  snapshot: Pick<ApplicationSnapshot, "applicationId" | "invitationId"> | null,
  token: string | null,
) {
  const inviteKey = snapshot?.invitationId || snapshot?.applicationId || token;

  return inviteKey
    ? `${INVITE_NOTICE_STORAGE_KEY_PREFIX}:${inviteKey}`
    : null;
}

export function hasSeenInviteNotice(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "seen";
  } catch {
    return false;
  }
}

export function rememberInviteNotice(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "seen");
  } catch {
  }
}
