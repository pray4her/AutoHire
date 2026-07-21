import type { InviteHashAlgorithm } from "@/lib/auth/token";
import { formatInvitationDateTime } from "@/lib/invitations/date-format";

export const ALGORITHM_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: InviteHashAlgorithm;
  readonly description: string;
}> = [
  {
    label: "SHA-256",
    value: "SHA256",
    description: "默认算法，兼容现有邀请链接",
  },
  {
    label: "SHA-384",
    value: "SHA384",
    description: "更长摘要，仅在有明确要求时使用",
  },
  {
    label: "SHA-512",
    value: "SHA512",
    description: "最长摘要，仅在有明确要求时使用",
  },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function createDefaultIdempotencyKey() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const random = crypto.randomUUID().slice(0, 8);

  return `invite-${stamp}-${random}`;
}

export function formatDateTime(value: string) {
  return formatInvitationDateTime(value);
}

export function getAlgorithmDescription(algorithm: InviteHashAlgorithm) {
  return (
    ALGORITHM_OPTIONS.find((item) => item.value === algorithm)?.description ??
    ""
  );
}

export function isInviteHashAlgorithm(
  value: string,
): value is InviteHashAlgorithm {
  return ALGORITHM_OPTIONS.some((item) => item.value === value);
}
