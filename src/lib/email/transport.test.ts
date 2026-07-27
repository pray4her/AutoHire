import { afterEach, describe, expect, it } from "vitest";

import {
  clearRecordedEmails,
  createEmailSender,
  createEmailSenderFromEnv,
  createRecordingEmailSender,
  findLatestRecordedOtp,
  getGlobalRecordingEmailSender,
} from "@/lib/email/transport";
import { resetEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  resetEnvForTests();
  clearRecordedEmails();
});

describe("email transport", () => {
  it("records send calls when using an injected sender", async () => {
    const { sender, calls } = createRecordingEmailSender();

    const result = await sender.send({
      to: "expert@example.com",
      subject: "Test subject",
      text: "Plain text body",
      html: "<p>HTML body</p>",
    });

    expect(result.messageId).toBe("test-message-1");
    expect(calls).toEqual([
      {
        to: "expert@example.com",
        subject: "Test subject",
        text: "Plain text body",
        html: "<p>HTML body</p>",
      },
    ]);
  });

  it("wraps a custom send implementation", async () => {
    const sender = createEmailSender(async () => ({ messageId: "custom-id" }));

    await expect(
      sender.send({
        to: "expert@example.com",
        subject: "Subject",
        text: "Text",
        html: "<p>Html</p>",
      }),
    ).resolves.toEqual({ messageId: "custom-id" });
  });

  it("uses the global recording sender when EMAIL_TRANSPORT_MODE=recording", async () => {
    process.env.EMAIL_TRANSPORT_MODE = "recording";
    resetEnvForTests();

    const sender = createEmailSenderFromEnv();
    expect(sender).toBe(getGlobalRecordingEmailSender());

    await sender.send({
      to: "friend@example.com",
      subject: "AutoHire verification code: 424242",
      text: "Your AutoHire verification code is:\n\n424242\n",
      html: "<p>424242</p>",
    });

    expect(findLatestRecordedOtp("friend@example.com")).toBe("424242");
  });
});
