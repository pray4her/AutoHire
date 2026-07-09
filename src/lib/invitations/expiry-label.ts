export function formatInvitationExpiryLabel(input: {
  readonly expiredDays: number;
  readonly expiredHours: number;
  readonly expiredMinutes: number;
}) {
  if (input.expiredDays > 0) {
    return `${input.expiredDays} days`;
  }

  const parts: string[] = [];
  if (input.expiredHours > 0) {
    parts.push(`${input.expiredHours}h`);
  }
  if (input.expiredMinutes > 0) {
    parts.push(`${input.expiredMinutes}m`);
  }

  return parts.join(" ") || "0m";
}
