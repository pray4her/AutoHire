const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}

export function resolveReportEmailRecipient(input: {
  invitationEmail?: string | null;
  screeningContactEmail?: string | null;
  screeningWorkEmail?: string | null;
}): string | null {
  return (
    normalizeEmail(input.invitationEmail) ??
    normalizeEmail(input.screeningContactEmail) ??
    normalizeEmail(input.screeningWorkEmail)
  );
}
