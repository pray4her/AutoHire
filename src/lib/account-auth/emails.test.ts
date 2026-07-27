import { describe, expect, it } from "vitest";

import { createRecordingEmailSender } from "@/lib/email/transport";
import {
  renderAccountAuthOtpEmail,
  sendAccountAuthOtpEmail,
} from "@/lib/account-auth/emails";

describe("renderAccountAuthOtpEmail", () => {
  it("renders the email-verification code with expiry and purpose", () => {
    const rendered = renderAccountAuthOtpEmail({
      otp: "123456",
      type: "email-verification",
      appName: "AutoHire",
      expiresInMinutes: 10,
    });

    expect(rendered.subject).toContain("123456");
    expect(rendered.subject).toContain("AutoHire");
    expect(rendered.text).toContain("123456");
    expect(rendered.text).toContain("10 minutes");
    expect(rendered.text).toContain("complete your registration");
    expect(rendered.html).toContain("123456");
  });

  it("renders the forget-password purpose copy", () => {
    const rendered = renderAccountAuthOtpEmail({
      otp: "654321",
      type: "forget-password",
      appName: "AutoHire",
      expiresInMinutes: 10,
    });

    expect(rendered.text).toContain("reset your password");
    expect(rendered.text).toContain("password will stay unchanged");
    expect(rendered.text).not.toContain("complete your registration");
  });
});

describe("sendAccountAuthOtpEmail", () => {
  it("sends the OTP through the injected email sender", async () => {
    const { sender, calls } = createRecordingEmailSender();

    const result = await sendAccountAuthOtpEmail({
      sender,
      email: "expert@example.com",
      otp: "246810",
      type: "email-verification",
      appName: "AutoHire",
      expiresInMinutes: 10,
    });

    expect(result.messageId).toBe("test-message-1");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.to).toBe("expert@example.com");
    expect(calls[0]?.subject).toContain("246810");
    expect(calls[0]?.text).toContain("246810");
  });
});
