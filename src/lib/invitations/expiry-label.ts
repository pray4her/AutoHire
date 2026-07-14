export function formatInvitationExpiryLabel(input: {
  readonly expiredDays: number;
  readonly expiredHours: number;
  readonly expiredMinutes: number;
}) {
  if (input.expiredDays > 0) {
    return `${input.expiredDays} 天`;
  }

  const parts: string[] = [];
  if (input.expiredHours > 0) {
    parts.push(`${input.expiredHours} 小时`);
  }
  if (input.expiredMinutes > 0) {
    parts.push(`${input.expiredMinutes} 分钟`);
  }

  return parts.join(" ") || "0 分钟";
}
