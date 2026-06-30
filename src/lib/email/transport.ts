import { getEnv } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SendEmailResult = {
  messageId: string;
};

export type EmailSender = {
  send(input: SendEmailInput): Promise<SendEmailResult>;
};

export function createEmailSender(
  sendImpl: EmailSender["send"],
): EmailSender {
  return { send: sendImpl };
}

export function createRecordingEmailSender() {
  const calls: SendEmailInput[] = [];

  const sender = createEmailSender(async (input) => {
    calls.push(input);
    return { messageId: `test-message-${calls.length}` };
  });

  return { sender, calls };
}

export function createNodemailerEmailSender(input: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}): EmailSender {
  return createEmailSender(async (message) => {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: input.host,
      port: input.port,
      secure: input.secure,
      auth:
        input.user && input.pass
          ? { user: input.user, pass: input.pass }
          : undefined,
    });

    const result = await transport.sendMail({
      from: input.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return {
      messageId: result.messageId ?? "unknown",
    };
  });
}

export function createEmailSenderFromEnv(): EmailSender {
  const env = getEnv();

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.EMAIL_FROM) {
    throw new Error("SMTP configuration is incomplete.");
  }

  return createNodemailerEmailSender({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  });
}
