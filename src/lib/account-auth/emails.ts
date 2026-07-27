import type { EmailSender } from "@/lib/email/transport";

export type AccountAuthOtpType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

export type RenderedAccountAuthOtpEmail = {
  subject: string;
  text: string;
  html: string;
};

export type RenderAccountAuthOtpEmailInput = {
  otp: string;
  type: AccountAuthOtpType;
  appName: string;
  expiresInMinutes: number;
};

const OTP_PURPOSE: Record<
  AccountAuthOtpType,
  { action: string; ignore: string }
> = {
  "email-verification": {
    action: "complete your registration",
    ignore:
      "If you did not create an account, you can safely ignore this email.",
  },
  "forget-password": {
    action: "reset your password",
    ignore:
      "If you did not request a password reset, you can safely ignore this email. Your password will stay unchanged.",
  },
  "sign-in": {
    action: "sign in",
    ignore: "If you did not try to sign in, you can safely ignore this email.",
  },
  "change-email": {
    action: "change your email address",
    ignore:
      "If you did not request an email change, you can safely ignore this email.",
  },
};

export function renderAccountAuthOtpEmail(
  input: RenderAccountAuthOtpEmailInput,
): RenderedAccountAuthOtpEmail {
  const purpose = OTP_PURPOSE[input.type];
  const subject = `${input.appName} verification code: ${input.otp}`;

  const text = [
    "Dear Applicant,",
    "",
    `Your ${input.appName} verification code is:`,
    "",
    input.otp,
    "",
    `Use this code to ${purpose.action}. It expires in ${input.expiresInMinutes} minutes.`,
    "",
    purpose.ignore,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body>
    <p>Dear Applicant,</p>
    <p>Your ${input.appName} verification code is:</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${input.otp}</p>
    <p>Use this code to ${purpose.action}. It expires in ${input.expiresInMinutes} minutes.</p>
    <p>${purpose.ignore}</p>
  </body>
</html>`;

  return { subject, text, html };
}

export type SendAccountAuthOtpEmailInput = RenderAccountAuthOtpEmailInput & {
  sender: EmailSender;
  email: string;
};

export async function sendAccountAuthOtpEmail(
  input: SendAccountAuthOtpEmailInput,
) {
  const rendered = renderAccountAuthOtpEmail(input);

  return input.sender.send({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
