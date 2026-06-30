import { describe, expect, it } from "vitest";

import {
  createEmailSender,
  createRecordingEmailSender,
} from "@/lib/email/transport";

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
});
